const { verifyToken, createClerkClient } = require("@clerk/clerk-sdk-node");
const prisma = require("../lib/prisma");

// Re-usable: verify the Bearer token and return the Clerk user ID
async function verifyClerkToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.split(" ")[1];
  if (!token) throw new Error("Empty token");

  try {
    // verifyToken is a standalone function (works across all @clerk/clerk-sdk-node versions)
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    return payload.sub; // Clerk user ID
  } catch (err) {
    // Fallback: use createClerkClient for older SDK versions
    try {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const payload = await clerk.verifyToken(token);
      return payload.sub;
    } catch (innerErr) {
      throw new Error("Invalid or expired token");
    }
  }
}

// requireAuth: verifies the JWT and attaches the DB user to req.user
// Returns 401 if the user is not found in our DB (new sign-up case for /users/sync)
const requireAuth = async (req, res, next) => {
  try {
    let clerkUserId;
    try {
      clerkUserId = await verifyClerkToken(req.headers.authorization);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    // Look up user in our database
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { institution: true },
    });

    if (!user) {
      // For the /users/sync route we still need to know the clerkUserId
      // even if the DB record doesn't exist yet. Attach it so the route
      // handler can create the record.
      req.clerkUserId = clerkUserId;
      return res.status(401).json({ error: "User not found. Please complete sign-up." });
    }

    req.user = user;
    req.clerkUserId = clerkUserId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

// requireAuthOrNew: like requireAuth but allows through if the user is not in DB yet.
// Used exclusively for POST /users/sync so new sign-ups can create their record.
const requireAuthOrNew = async (req, res, next) => {
  try {
    let clerkUserId;
    try {
      clerkUserId = await verifyClerkToken(req.headers.authorization);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    // Attach clerkUserId regardless of whether DB record exists
    req.clerkUserId = clerkUserId;

    // Also attach user if they already exist
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { institution: true },
    });

    if (user) req.user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

// requireRole: gates a route to specific roles. Must run after requireAuth.
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required: ${roles.join(", ")}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};

module.exports = { requireAuth, requireAuthOrNew, requireRole };


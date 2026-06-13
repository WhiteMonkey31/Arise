import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma.js";

const SECRET_KEY = process.env.SECRET_KEY || "secret";

export const register = async (req, res) => {
  try {
    const { email, password, org_name, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ detail: "Email already registered" });
    }

    let slug = org_name.toLowerCase().replace(/ /g, "-").slice(0, 100);
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      slug = `${slug}-${Date.now()}`;
    }

    const org = await prisma.organization.create({
      data: { name: org_name, slug },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        orgId: org.id,
        role: role || "BID_MANAGER",
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      org_id: user.orgId,
      role: user.role,
      is_active: user.isActive,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    // FastAPI's OAuth2PasswordRequestForm uses x-www-form-urlencoded with username/password
    // But we'll accept both JSON and form data for simplicity
    const email = req.body.username || req.body.email;
    const password = req.body.password;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
      return res.status(401).json({ detail: "Incorrect email or password" });
    }

    if (!user.isActive) {
      return res.status(400).json({ detail: "Account is inactive" });
    }

    const token = jwt.sign(
      { sub: user.id, org_id: user.orgId, role: user.role },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    res.json({
      access_token: token,
      token_type: "bearer",
      user_id: user.id,
      org_id: user.orgId,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
};

export const getMe = async (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    email: user.email,
    org_id: user.orgId,
    role: user.role,
    is_active: user.isActive,
  });
};

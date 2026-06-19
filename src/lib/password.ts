import { compare, hash } from "bcryptjs";

const saltRounds = 12;

export const hashPassword = (password: string) => hash(password, saltRounds);

export const verifyPassword = (password: string, passwordHash: string) =>
  compare(password, passwordHash);

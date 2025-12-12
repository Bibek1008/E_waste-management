import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Email, code, and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    // Find user with reset code
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.resetCode || !user.resetCodeExpires) {
      return NextResponse.json({ error: "Invalid or expired reset code" }, { status: 400 });
    }

    // Check if code has expired
    if (new Date() > user.resetCodeExpires) {
      // Clean up expired reset code
      await prisma.user.update({
        where: { email },
        data: {
          resetCode: null,
          resetCodeExpires: null
        }
      });
      return NextResponse.json({ error: "Reset code has expired. Please request a new one." }, { status: 400 });
    }

    // Verify the reset code
    const isCodeValid = await bcryptjs.compare(code, user.resetCode);
    if (!isCodeValid) {
      return NextResponse.json({ error: "Invalid reset code" }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update user's password and clear reset code
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpires: null
      }
    });

    return NextResponse.json({ 
      message: "Password has been reset successfully" 
    });

  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
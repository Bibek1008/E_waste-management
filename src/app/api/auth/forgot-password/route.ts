import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

// In a real application, you would use a proper email service like SendGrid, Nodemailer, etc.
// For this example, we'll simulate sending an email by storing the code in the database

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({ message: "If an account with that email exists, a password reset code has been sent." });
    }

    // Generate a 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the code before storing (optional, but good practice)
    const hashedCode = await bcryptjs.hash(resetCode, 10);

    // Store the reset code in the database (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Update or create password reset entry
    await prisma.user.update({
      where: { email },
      data: {
        // You'll need to add these fields to your User model in Prisma
        resetCode: hashedCode,
        resetCodeExpires: expiresAt
      }
    });

    // In a real application, you would send an email here
    // For demonstration, we'll log the code to the console
    console.log(`Password reset code for ${email}: ${resetCode}`);
    console.log(`This code expires at: ${expiresAt}`);

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({ 
      message: "If an account with that email exists, a password reset code has been sent.",
      // Remove this in production - only for testing
      resetCode: resetCode
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
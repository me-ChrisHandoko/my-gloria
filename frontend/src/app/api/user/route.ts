import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get the authenticated user's ID from Clerk
    const { userId } = await auth();

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Example: Fetch user data from your database
    // const userData = await db.user.findUnique({ where: { clerkId: userId } });

    // For now, return the Clerk user ID
    return NextResponse.json({
      userId,
      message: "This is a protected API route",
      // Add your business logic here
    });
  } catch (error) {
    console.error("Error in user API route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Example: Update user profile
    // const updatedUser = await db.user.update({
    //   where: { clerkId: userId },
    //   data: body
    // });

    return NextResponse.json({
      success: true,
      userId,
      data: body,
      message: "User data processed successfully",
    });
  } catch (error) {
    console.error("Error in user API route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
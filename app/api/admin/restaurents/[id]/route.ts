import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const ADMIN_EMAIL = "aflahalungal77@gmail.com";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc(
      "delete_restaurant_as_platform_admin",
      {
        target_restaurant_id: id,
      }
    );

    if (error) {
      console.error("Restaurant deletion error:", error);

      return NextResponse.json(
        {
          error: error.message || "Failed to delete restaurant",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Restaurant deleted successfully",
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
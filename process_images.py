from PIL import Image, ImageDraw

def process_image(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    # Create a mask with rounded rectangle shape (squircle - more square-like)
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)

    # Calculate corner radius to make it more square-like (use larger radius)
    # For squircle/pill shape, use roughly 1/4 of the smaller dimension
    corner_radius = min(width, height) // 2

    # Draw rounded rectangle with squircle corners
    draw.rounded_rectangle(
        [(0, 0), (width - 1, height - 1)],
        radius=corner_radius,
        fill=255
    )

    # Apply mask to create rounded image
    result = img.copy()
    result.putalpha(mask)

    # Save as PNG to preserve transparency
    result.save(output_path, "PNG")
    print(f"Processed: {output_path}")

# Process both images
process_image(
    r"d:\program\BrowserMain\assets\c__Users_WINDOWS_AppData_Roaming_Cursor_User_workspaceStorage_d266e78c4882c98ea1953885c5841e50_images_image-d21f3e69-fc8f-4866-a205-37dfa6dbcbc3.png",
    r"d:\program\BrowserMain\assets\c__Users_WINDOWS_AppData_Roaming_Cursor_User_workspaceStorage_d266e78c4882c98ea1953885c5841e50_images_image-d21f3e69-fc8f-4866-a205-37dfa6dbcbc3_processed.png"
)

process_image(
    r"d:\program\BrowserMain\assets\c__Users_WINDOWS_AppData_Roaming_Cursor_User_workspaceStorage_d266e78c4882c98ea1953885c5841e50_images_image-1ee14d6f-ef49-459e-b260-f37b0ebd9fb6.png",
    r"d:\program\BrowserMain\assets\c__Users_WINDOWS_AppData_Roaming_Cursor_User_workspaceStorage_d266e78c4882c98ea1953885c5841e50_images_image-1ee14d6f-ef49-459e-b260-f37b0ebd9fb6_processed.png"
)

print("Done!")

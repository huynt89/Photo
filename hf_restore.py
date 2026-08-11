import os
import shutil
from gradio_client import Client, handle_file
from PIL import Image

def resize_if_needed(image_path, max_pixels=3_500_000):
    """Tự động giảm kích thước ảnh nếu tổng số pixel vượt giới hạn"""
    with Image.open(image_path) as img:
        width, height = img.size
        total_pixels = width * height
        
        if total_pixels > max_pixels:
            scale = (max_pixels / total_pixels) ** 0.5
            new_w = int(width * scale)
            new_h = int(height * scale)
            
            resized_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            temp_path = "temp_input.jpg"
            resized_img.save(temp_path, quality=95)
            return temp_path, True
            
    return image_path, False

def restore_photo_codeformer():
    input_path = "old_photo.jpg"       
    output_path = "restored_photo.png" 
    
    if not os.path.exists(input_path):
        print(f"❌ Khong tim thay tep anh: {input_path}")
        return

    # Kiểm tra và tối ưu kích thước ảnh
    process_path, was_resized = resize_if_needed(input_path)
    if was_resized:
        print("⚠️ Anh goc lon hon 4MP, da tu dong resize ve kich thuoc an toan...")

    print("⏳ Dang ket noi voi may chu CodeFormer tren Hugging Face...")
    
    try:
        client = Client("sczhou/CodeFormer")
        print("⏳ Dang xu ly anh (co the mat 10-30 giay), vui long cho...")
        
        result = client.predict(
            handle_file(process_path),
            True,  # background_enhance
            True,  # face_upsample
            2,     # upscale
            0.5,   # codeformer_fidelity
            fn_index=0
        )
        
        temp_file_path = result[0] if isinstance(result, tuple) else result
        shutil.copy(temp_file_path, output_path)
        
        # Dọn dẹp tệp tạm
        if was_resized and os.path.exists(process_path):
            os.remove(process_path)
            
        print(f"✅ Tuyet voi! Anh da duoc phuc hoi va luu tai: {output_path}")
        
    except Exception as e:
        print(f"❌ Da xay ra loi: {e}")

if __name__ == "__main__":
    restore_photo_codeformer()
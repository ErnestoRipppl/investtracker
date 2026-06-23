import zlib
import struct
import os


def make_png(width, height):
    # Signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    # width, height, bit depth (8), color type (6 = RGBA), compression (0), filter (0), interlace (0)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png += struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data))
    
    # Generate pixel data
    # Dark background with an emerald green logo.
    raw_data = bytearray()
    
    cx, cy = width / 2.0, height / 2.0
    r_circle = width * 0.35
    
    for y in range(height):
        raw_data.append(0) # Filter type 0
        for x in range(width):
            dx = x - cx
            dy = y - cy
            dist = (dx*dx + dy*dy)**0.5
            
            # Simple logo: an arrow pointing up-right in a circle
            is_circle_ring = (r_circle - width*0.035) <= dist <= (r_circle + width*0.035)
            
            # Draw a diagonal trend arrow: x + y = width
            is_arrow_line = False
            if 0.32*width <= x <= 0.68*width and 0.32*height <= y <= 0.68*height:
                if abs((x + y) - width) < width * 0.04:
                    is_arrow_line = True
            
            # Arrow head at (0.68*width, 0.32*height)
            is_arrow_head = False
            if 0.58*width <= x <= 0.70*width and 0.30*height <= y <= 0.42*height:
                hx = 0.68 * width
                hy = 0.32 * height
                # check triangular head condition
                if (x - hx) - (y - hy) > -width * 0.02 and (x >= y - width * 0.1):
                    is_arrow_head = True
            
            if is_circle_ring or is_arrow_line or is_arrow_head:
                # Emerald green: #10b981
                raw_data.extend((16, 185, 129, 255))
            else:
                # Dark navy background: #090e1a
                raw_data.extend((9, 14, 26, 255))
                
    # Compress data
    idat_data = zlib.compress(raw_data)
    png += struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', zlib.crc32(b'IDAT' + idat_data))
    
    # IEND chunk
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND'))
    
    return png


def main():
    public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/public"))
    os.makedirs(public_dir, exist_ok=True)
    
    # 192x192 icon
    icon192 = make_png(192, 192)
    with open(os.path.join(public_dir, "icon-192.png"), "wb") as f:
        f.write(icon192)
    print("Created icon-192.png")
        
    # 512x512 icon
    icon512 = make_png(512, 512)
    with open(os.path.join(public_dir, "icon-512.png"), "wb") as f:
        f.write(icon512)
    print("Created icon-512.png")


if __name__ == "__main__":
    main()

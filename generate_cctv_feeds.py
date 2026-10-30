import os
import cv2
import numpy as np
import subprocess

os.makedirs('backend/uploads', exist_ok=True)

W, H = 640, 360
FPS = 25
DURATION = 8.0
TOTAL_FRAMES = int(FPS * DURATION)

def add_cctv_effects(frame, cam_name, sector_name, t, frame_idx):
    """Adds subtle surveillance vignette, camera scanline effect, and authentic CCTV telemetry."""
    # 1. Subtle vignette
    rows, cols = frame.shape[:2]
    X_resultant_kernel = cv2.getGaussianKernel(cols, cols * 0.75)
    Y_resultant_kernel = cv2.getGaussianKernel(rows, rows * 0.75)
    kernel = Y_resultant_kernel * X_resultant_kernel.T
    mask = 255 * kernel / np.linalg.norm(kernel)
    mask = mask / mask.max()
    vignette = np.dstack([mask * 0.35 + 0.65] * 3)
    frame = np.clip(frame * vignette, 0, 255).astype(np.uint8)

    # 2. Subtle CCTV noise
    noise = np.random.normal(0, 1.5, frame.shape).astype(np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # 3. Clean CCTV OSD banner (Top)
    cv2.rectangle(frame, (0, 0), (W, 24), (10, 15, 25), -1)
    # Demo indicator dot (cyan/blue)
    dot_color = (220, 160, 40) if (frame_idx % 20 < 14) else (140, 90, 20)
    cv2.circle(frame, (14, 12), 4, dot_color, -1)
    cv2.putText(frame, "DEMO", (23, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (200, 230, 255), 1, cv2.LINE_AA)
    cv2.putText(frame, f"{cam_name} • {sector_name}", (68, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (220, 235, 250), 1, cv2.LINE_AA)

    # Time OSD (IST)
    sec_int = int(t)
    sub_sec = int((t - sec_int) * 100)
    time_str = f"2026-10-30 14:30:{sec_int:02d}.{sub_sec:02d} IST"
    cv2.putText(frame, time_str, (W - 195, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200, 220, 240), 1, cv2.LINE_AA)

    # 4. Clean CCTV Telemetry (Bottom)
    cv2.rectangle(frame, (0, H - 20), (W, H), (10, 15, 25), -1)
    cv2.putText(frame, f"CHANDIGARH DEMO SURVEILLANCE GRID | 25 FPS | H.264", (10, H - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.32, (150, 175, 200), 1, cv2.LINE_AA)

    # Demo footage watermark (strictly: NOT A LIVE CCTV STREAM)
    cv2.rectangle(frame, (W - 195, H - 18), (W - 6, H - 2), (20, 45, 95), -1)
    cv2.putText(frame, "DEMO FOOTAGE — NOT LIVE STREAM", (W - 190, H - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.28, (230, 240, 255), 1, cv2.LINE_AA)

    return frame

# ==========================================
# 1. CAM-17-001: Sector 17 Plaza (Pedestrians)
# ==========================================
def render_cam_17(f):
    t = f / FPS
    frame = np.zeros((H, W, 3), dtype=np.uint8)

    # Sky / background building facade
    frame[:int(H * 0.35), :] = (75, 85, 95)
    # Architectural arches and columns
    for col_x in range(20, W, 80):
        cv2.rectangle(frame, (col_x, 40), (col_x + 35, int(H * 0.35)), (55, 65, 75), -1)
        cv2.rectangle(frame, (col_x + 5, 45), (col_x + 30, int(H * 0.35)), (40, 48, 56), -1)

    # Plaza Ground (Paved tile terrace)
    frame[int(H * 0.35):, :] = (90, 100, 110)
    # Perspective grid lines for plaza tiles
    for px in range(-100, W + 200, 45):
        vanishing_pt = (int(W * 0.5), int(H * 0.25))
        bottom_x = int(px + (px - W * 0.5) * 1.2)
        cv2.line(frame, (px, int(H * 0.35)), (bottom_x, H), (75, 85, 95), 1)
    for py in range(int(H * 0.35), H, 28):
        cv2.line(frame, (0, py), (W, py), (80, 90, 100), 1)

    # Plaza decorative elements (landscaped planters & benches)
    cv2.rectangle(frame, (80, int(H * 0.42)), (180, int(H * 0.50)), (45, 55, 65), -1)
    cv2.rectangle(frame, (85, int(H * 0.43)), (175, int(H * 0.48)), (40, 85, 45), -1) # Green shrubs
    cv2.rectangle(frame, (460, int(H * 0.42)), (560, int(H * 0.50)), (45, 55, 65), -1)
    cv2.rectangle(frame, (465, int(H * 0.43)), (555, int(H * 0.48)), (40, 85, 45), -1)

    # Stone Benches
    cv2.rectangle(frame, (280, int(H * 0.48)), (360, int(H * 0.52)), (60, 70, 80), -1)

    # Draw 8 Realistic Pedestrians Walking
    pedestrians = [
        # (id, base_speed, dir, start_x, y, color_shirt, color_pants, height, width)
        (1, 42, 1, 60, int(H * 0.65), (180, 80, 50), (40, 40, 50), 52, 20),
        (2, 36, -1, W - 80, int(H * 0.55), (60, 140, 180), (30, 30, 40), 44, 18),
        (3, 28, 1, 140, int(H * 0.78), (200, 160, 80), (50, 50, 60), 60, 22),
        (4, 48, 1, -20, int(H * 0.60), (90, 60, 150), (40, 40, 45), 48, 19),
        (5, 24, -1, W - 140, int(H * 0.82), (160, 70, 70), (45, 45, 55), 62, 23),
        (6, 32, 1, 240, int(H * 0.52), (80, 160, 90), (35, 35, 40), 42, 17),
        (7, 30, -1, W - 20, int(H * 0.70), (140, 130, 120), (30, 35, 45), 54, 21),
        (8, 20, 1, 310, int(H * 0.54), (190, 190, 190), (40, 40, 50), 40, 16),
    ]

    for p in pedestrians:
        _, spd, d, sx, py, shirt_c, pants_c, ph, pw = p
        px = int((sx + d * spd * t) % (W + 80) - 40)
        if d == -1:
            px = W - px

        # Ground shadow
        cv2.ellipse(frame, (px, py + ph // 2), (pw // 2 + 4, 5), 0, 0, 360, (50, 55, 60), -1)

        # Legs (walking animation based on time)
        leg_phase = np.sin(t * 8 + p[0]) * 5
        cv2.line(frame, (px - 3, py + ph // 6), (int(px - 3 + leg_phase), py + ph // 2), pants_c, 3)
        cv2.line(frame, (px + 3, py + ph // 6), (int(px + 3 - leg_phase), py + ph // 2), pants_c, 3)

        # Torso
        cv2.rectangle(frame, (px - pw // 2, py - ph // 4), (px + pw // 2, py + ph // 6), shirt_c, -1)
        # Head
        cv2.circle(frame, (px, py - ph // 4 - 6), 6, (180, 160, 150), -1)

    return add_cctv_effects(frame, "CAM-17-001", "Sector 17 - Plaza Promenade", t, f)

# ==========================================
# 2. CAM-22-003: Sector 22 Market (Traffic)
# ==========================================
def render_cam_22(f):
    t = f / FPS
    frame = np.zeros((H, W, 3), dtype=np.uint8)

    # Sidewalk & market backdrop
    frame[:int(H * 0.32), :] = (55, 65, 75)
    # Storefront canopy outlines
    for sx in range(10, W, 70):
        cv2.rectangle(frame, (sx, 40), (sx + 55, int(H * 0.32)), (70, 80, 95), -1)
        cv2.rectangle(frame, (sx, int(H * 0.30)), (sx + 55, int(H * 0.32)), (180, 120, 50), -1)

    # Roadway (Dark asphalt)
    frame[int(H * 0.32):, :] = (38, 42, 46)
    # Yellow solid center double line
    cv2.line(frame, (0, int(H * 0.62) - 2), (W, int(H * 0.62) - 2), (40, 180, 230), 2)
    cv2.line(frame, (0, int(H * 0.62) + 2), (W, int(H * 0.62) + 2), (40, 180, 230), 2)

    # Dashed lane dividers
    for lx in range(int(f * 20) % 50, W, 50):
        cv2.line(frame, (lx, int(H * 0.46)), (lx + 25, int(H * 0.46)), (210, 210, 210), 2)
        cv2.line(frame, (lx, int(H * 0.78)), (lx + 25, int(H * 0.78)), (210, 210, 210), 2)

    # Road curb & sidewalk
    cv2.line(frame, (0, int(H * 0.32)), (W, int(H * 0.32)), (160, 170, 180), 2)
    cv2.line(frame, (0, H - 22), (W, H - 22), (160, 170, 180), 2)

    # 12 Vehicles in traffic flow
    vehicles = [
        # (id, category, spd, dir, sx, y, w_box, h_box, color)
        (1, "CAR", 65, 1, 80, int(H * 0.46), 56, 26, (210, 210, 215)),       # Silver Sedan
        (2, "BUS", 45, 1, -40, int(H * 0.38), 95, 34, (30, 110, 190)),       # CTU Bus Blue/Red
        (3, "CAR", 60, 1, 260, int(H * 0.47), 52, 25, (45, 45, 50)),         # Black Sedan
        (4, "SUV", 55, -1, W - 60, int(H * 0.70), 62, 29, (190, 190, 190)),   # White SUV
        (5, "AUTO", 40, -1, W - 190, int(H * 0.84), 36, 24, (20, 170, 220)),  # Auto Rickshaw
        (6, "CAR", 68, -1, W - 320, int(H * 0.71), 54, 25, (160, 60, 45)),    # Red Hatchback
        (7, "MOTO", 70, 1, 380, int(H * 0.52), 26, 16, (30, 30, 35)),        # Motorcycle
        (8, "CAR", 58, 1, 480, int(H * 0.46), 55, 26, (90, 110, 125)),      # Blue Sedan
        (9, "BUS", 42, -1, W - 450, int(H * 0.85), 90, 33, (40, 130, 60)),   # Green MiniBus
        (10, "CAR", 64, -1, W - 560, int(H * 0.70), 53, 25, (180, 175, 170)),# Pearl Car
        (11, "SUV", 52, 1, 190, int(H * 0.39), 60, 28, (60, 75, 80)),        # Grey SUV
        (12, "MOTO", 66, -1, W - 250, int(H * 0.76), 25, 16, (40, 40, 180)), # Red Bike
    ]

    for v in vehicles:
        _, cat, spd, d, sx, vy, vw, vh, col = v
        vx = int((sx + d * spd * t) % (W + 140) - 70)
        if d == -1:
            vx = W - vx

        # Shadow
        cv2.rectangle(frame, (vx - vw//2 - 2, vy - vh//2 + 3), (vx + vw//2 + 2, vy + vh//2 + 5), (20, 24, 28), -1)
        # Vehicle Body
        cv2.rectangle(frame, (vx - vw//2, vy - vh//2), (vx + vw//2, vy + vh//2), col, -1)
        # Cabin / Windshield
        cabin_w = int(vw * 0.55)
        cabin_h = int(vh * 0.70)
        cv2.rectangle(frame, (vx - cabin_w//2, vy - cabin_h//2), (vx + cabin_w//2, vy + cabin_h//2), (30, 35, 40), -1)
        # Wheels
        cv2.circle(frame, (vx - int(vw * 0.35), vy + vh//2), 3, (15, 15, 15), -1)
        cv2.circle(frame, (vx + int(vw * 0.35), vy + vh//2), 3, (15, 15, 15), -1)

    return add_cctv_effects(frame, "CAM-22-003", "Sector 22 - Market Avenue", t, f)

# ==========================================
# 3. CAM-35-002: Sector 35 Roundabout (Public Space)
# ==========================================
def render_cam_35(f):
    t = f / FPS
    frame = np.zeros((H, W, 3), dtype=np.uint8)

    # Surrounding urban scene
    frame[:, :] = (48, 56, 64)

    # Circular Roundabout Road
    center_x, center_y = int(W * 0.50), int(H * 0.55)
    cv2.circle(frame, (center_x, center_y), 150, (36, 40, 44), -1)
    cv2.circle(frame, (center_x, center_y), 150, (140, 150, 160), 2) # Outer curb

    # Central Roundabout Island (Lush Greenery & Fountain)
    cv2.circle(frame, (center_x, center_y), 70, (40, 95, 50), -1)
    cv2.circle(frame, (center_x, center_y), 70, (120, 170, 130), 2)
    cv2.circle(frame, (center_x, center_y), 22, (180, 150, 60), -1) # Fountain water

    # Pedestrian Crosswalks (Zebra crossings)
    for z in range(-35, 36, 12):
        cv2.rectangle(frame, (center_x + z - 4, int(H * 0.22)), (center_x + z + 4, int(H * 0.28)), (220, 220, 220), -1)
        cv2.rectangle(frame, (int(W * 0.14), center_y + z - 4), (int(W * 0.20), center_y + z + 4), (220, 220, 220), -1)

    # Transit Waiting Pavilion (Right side)
    cv2.rectangle(frame, (W - 130, int(H * 0.35)), (W - 30, int(H * 0.55)), (65, 75, 85), -1)
    cv2.rectangle(frame, (W - 125, int(H * 0.37)), (W - 35, int(H * 0.42)), (180, 130, 40), -1)

    # 6 Multi-Object Tracked Entities (Pedestrians & Vehicles)
    # 1. Pedestrian at zebra crossing
    px1 = int(center_x + np.sin(t * 1.5) * 30)
    py1 = int(H * 0.25)
    cv2.circle(frame, (px1, py1 - 8), 5, (170, 150, 140), -1)
    cv2.rectangle(frame, (px1 - 5, py1 - 3), (px1 + 5, py1 + 10), (160, 60, 60), -1)

    # 2. Pedestrian walking along footpath
    px2 = int((80 + t * 25) % (W * 0.4))
    py2 = int(H * 0.80)
    cv2.circle(frame, (px2, py2 - 8), 5, (170, 150, 140), -1)
    cv2.rectangle(frame, (px2 - 5, py2 - 3), (px2 + 5, py2 + 10), (50, 120, 170), -1)

    # 3. Pedestrian waiting near transit pavilion
    px3 = W - 75
    py3 = int(H * 0.48)
    cv2.circle(frame, (px3, py3 - 8), 5, (170, 150, 140), -1)
    cv2.rectangle(frame, (px3 - 5, py3 - 3), (px3 + 5, py3 + 10), (70, 150, 80), -1)

    # 4. Vehicle 1 navigating rotary circle
    ang1 = t * 0.75
    r_orbit = 110
    cx1 = int(center_x + np.cos(ang1) * r_orbit)
    cy1 = int(center_y + np.sin(ang1) * (r_orbit * 0.7))
    cv2.rectangle(frame, (cx1 - 22, cy1 - 12), (cx1 + 22, cy1 + 12), (210, 210, 220), -1)
    cv2.rectangle(frame, (cx1 - 12, cy1 - 8), (cx1 + 12, cy1 + 8), (40, 45, 50), -1)

    # 5. Vehicle 2 navigating rotary circle
    ang2 = t * 0.75 + 2.8
    cx2 = int(center_x + np.cos(ang2) * r_orbit)
    cy2 = int(center_y + np.sin(ang2) * (r_orbit * 0.7))
    cv2.rectangle(frame, (cx2 - 24, cy2 - 13), (cx2 + 24, cy2 + 13), (40, 80, 150), -1)
    cv2.rectangle(frame, (cx2 - 14, cy2 - 9), (cx2 + 14, cy2 + 9), (30, 35, 40), -1)

    # 6. Pedestrian strolling near central island
    px4 = int(center_x + np.cos(t * 0.5 + 1.2) * 45)
    py4 = int(center_y + np.sin(t * 0.5 + 1.2) * 35)
    cv2.circle(frame, (px4, py4 - 7), 4, (160, 150, 140), -1)
    cv2.rectangle(frame, (px4 - 4, py4 - 3), (px4 + 4, py4 + 8), (140, 90, 160), -1)

    return add_cctv_effects(frame, "CAM-35-002", "Sector 35 - Rotary Public Space", t, f)

# ==========================================
# 4. CAM-43-001: Sector 43 Parking (Vehicles)
# ==========================================
def render_cam_43(f):
    t = f / FPS
    frame = np.zeros((H, W, 3), dtype=np.uint8)

    # Terminal Perimeter backdrop
    frame[:int(H * 0.28), :] = (50, 60, 70)
    # Terminal fence and gate
    for fx in range(0, W, 25):
        cv2.line(frame, (fx, int(H * 0.15)), (fx, int(H * 0.28)), (110, 120, 130), 1)

    # Parking Lot Ground (Dark asphalt)
    frame[int(H * 0.28):, :] = (40, 44, 48)

    # Marked Angled Parking Bays (Row A & Row B)
    # Row A: top angled bays
    for bx in range(40, W - 60, 75):
        cv2.line(frame, (bx, int(H * 0.35)), (bx + 30, int(H * 0.52)), (220, 220, 220), 2)
        cv2.putText(frame, f"A-{(bx//75)+1}", (bx + 10, int(H * 0.38)), cv2.FONT_HERSHEY_SIMPLEX, 0.28, (180, 180, 180), 1)

    # Row B: bottom angled bays
    for bx in range(40, W - 60, 75):
        cv2.line(frame, (bx, int(H * 0.70)), (bx + 30, int(H * 0.88)), (220, 220, 220), 2)
        cv2.putText(frame, f"B-{(bx//75)+1}", (bx + 10, int(H * 0.74)), cv2.FONT_HERSHEY_SIMPLEX, 0.28, (180, 180, 180), 1)

    # Driving lane center line
    cv2.line(frame, (0, int(H * 0.61)), (W, int(H * 0.61)), (60, 160, 200), 1)

    # 9 Parked & Moving Vehicles + 1 Pedestrian walking to car
    # Parked vehicles (Static in bays with slight engine vibration/lighting)
    parked = [
        # (id, bay_x, bay_y, w, h, color)
        (1, 80, int(H * 0.44), 52, 28, (215, 215, 220)), # Bay A-1
        (2, 155, int(H * 0.44), 55, 30, (50, 50, 55)),   # Bay A-2
        (3, 230, int(H * 0.44), 50, 27, (180, 60, 45)),  # Bay A-3
        (4, 380, int(H * 0.44), 54, 28, (90, 120, 130)), # Bay A-5
        (5, 80, int(H * 0.79), 56, 29, (190, 185, 175)), # Bay B-1
        (6, 230, int(H * 0.79), 54, 28, (40, 70, 130)),  # Bay B-3
        (7, 380, int(H * 0.79), 24, 16, (30, 30, 35)),   # Motorcycle bay
    ]

    for pv in parked:
        _, px, py, pw, ph, col = pv
        # Parked vehicle
        cv2.rectangle(frame, (px - pw//2, py - ph//2), (px + pw//2, py + ph//2), col, -1)
        cv2.rectangle(frame, (px - pw//4, py - ph//3), (px + pw//4, py + ph//3), (25, 30, 35), -1)

    # Moving Vehicle 1: Sedan cruising in lane (Aisle transit)
    mv1_x = int((t * 52) % (W + 120) - 60)
    mv1_y = int(H * 0.61)
    cv2.rectangle(frame, (mv1_x - 26, mv1_y - 13), (mv1_x + 26, mv1_y + 13), (220, 220, 220), -1)
    cv2.rectangle(frame, (mv1_x - 14, mv1_y - 8), (mv1_x + 14, mv1_y + 8), (30, 35, 40), -1)
    # Headlights
    cv2.circle(frame, (mv1_x + 26, mv1_y - 8), 3, (180, 255, 255), -1)
    cv2.circle(frame, (mv1_x + 26, mv1_y + 8), 3, (180, 255, 255), -1)

    # Moving Vehicle 2: SUV pulling into Bay B-2
    mv2_x = int(W - (t * 35) % (W + 100))
    mv2_y = int(H * 0.65)
    if mv2_x > 0 and mv2_x < W:
        cv2.rectangle(frame, (mv2_x - 28, mv2_y - 14), (mv2_x + 28, mv2_y + 14), (60, 80, 95), -1)
        cv2.rectangle(frame, (mv2_x - 15, mv2_y - 9), (mv2_x + 15, mv2_y + 9), (30, 35, 40), -1)

    # Pedestrian walking toward Bay A-2
    ped_x = int(120 + t * 8)
    ped_y = int(H * 0.52)
    cv2.circle(frame, (ped_x, ped_y - 7), 4, (160, 150, 140), -1)
    cv2.rectangle(frame, (ped_x - 4, ped_y - 3), (ped_x + 4, ped_y + 8), (180, 90, 50), -1)

    return add_cctv_effects(frame, "CAM-43-001", "Sector 43 - Parking Terminal", t, f)

# ==========================================
# Build & Transcode All 4 Streams
# ==========================================
stream_configs = [
    {
        'filename': 'cctv_cam_17_001.mp4',
        'render_fn': render_cam_17,
        'title': 'CAM-17-001 (Sector 17 Plaza)'
    },
    {
        'filename': 'cctv_cam_22_003.mp4',
        'render_fn': render_cam_22,
        'title': 'CAM-22-003 (Sector 22 Market)'
    },
    {
        'filename': 'cctv_cam_35_002.mp4',
        'render_fn': render_cam_35,
        'title': 'CAM-35-002 (Sector 35 Roundabout)'
    },
    {
        'filename': 'cctv_cam_43_001.mp4',
        'render_fn': render_cam_43,
        'title': 'CAM-43-001 (Sector 43 Parking)'
    }
]

for cfg in stream_configs:
    raw_path = os.path.join('backend/uploads', 'raw_' + cfg['filename'])
    final_path = os.path.join('backend/uploads', cfg['filename'])

    print(f"Rendering {cfg['title']}...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(raw_path, fourcc, float(FPS), (W, H))

    for frame_idx in range(TOTAL_FRAMES):
        frame = cfg['render_fn'](frame_idx)
        out.write(frame)

    out.release()

    # Transcode with ffmpeg for universal HTML5 playback
    cmd = [
        'ffmpeg', '-y', '-i', raw_path,
        '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.0',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-b:v', '500k',
        final_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(raw_path):
        os.remove(raw_path)

    file_size = os.path.getsize(final_path)
    print(f"Successfully created {final_path} ({file_size / 1024:.1f} KB)")

print("All 4 clean CCTV video feeds generated successfully.")

import cv2
import numpy as np
import subprocess
import os

os.makedirs('backend/uploads', exist_ok=True)

configs = [
    {
        'raw_name': 'raw_cam_17_001.mp4',
        'final_name': 'demo_cam_17_001.mp4',
        'title': 'CAM-17-001 • Sector 17 Plaza',
        'scene': 'plaza',
        'num_entities': 6
    },
    {
        'raw_name': 'raw_cam_22_003.mp4',
        'final_name': 'demo_cam_22_003.mp4',
        'title': 'CAM-22-003 • Sector 22 Market',
        'scene': 'market',
        'num_entities': 5
    },
    {
        'raw_name': 'raw_cam_35_002.mp4',
        'final_name': 'demo_cam_35_002.mp4',
        'title': 'CAM-35-002 • Sector 35 Roundabout',
        'scene': 'roundabout',
        'num_entities': 5
    },
    {
        'raw_name': 'raw_cam_43_001.mp4',
        'final_name': 'demo_cam_43_001.mp4',
        'title': 'CAM-43-001 • Sector 43 Transit',
        'scene': 'transit',
        'num_entities': 4
    }
]

W, H = 640, 360
FPS = 25
DURATION_SEC = 8
TOTAL_FRAMES = FPS * DURATION_SEC

for cfg in configs:
    raw_path = os.path.join('backend/uploads', cfg['raw_name'])
    final_path = os.path.join('backend/uploads', cfg['final_name'])
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(raw_path, fourcc, float(FPS), (W, H))
    
    scene = cfg['scene']
    title = cfg['title']
    
    for f in range(TOTAL_FRAMES):
        t = f / FPS
        frame = np.zeros((H, W, 3), dtype=np.uint8)
        
        # Base Scene Colors
        if scene == 'plaza':
            # Stone promenade
            frame[:] = (55, 65, 75)
            cv2.rectangle(frame, (0, 0), (W, int(H * 0.4)), (70, 80, 90), -1)
            # Promenade tiles
            for x in range(0, W, 60):
                cv2.line(frame, (x, int(H * 0.4)), (int(x + (x - W/2)*0.8), H), (45, 55, 65), 1)
            for y in range(int(H * 0.4), H, 35):
                cv2.line(frame, (0, y), (W, y), (45, 55, 65), 1)
        elif scene == 'market':
            frame[:] = (45, 55, 65)
            cv2.rectangle(frame, (0, 0), (W, int(H * 0.35)), (60, 70, 80), -1)
            # Market stalls outline
            for sx in range(20, W, 100):
                cv2.rectangle(frame, (sx, 40), (sx + 70, int(H * 0.35)), (50, 60, 70), -1)
                cv2.rectangle(frame, (sx, 40), (sx + 70, int(H * 0.35)), (80, 95, 110), 1)
        elif scene == 'roundabout':
            frame[:] = (35, 45, 55)
            # Roundabout center circle
            cv2.circle(frame, (int(W/2), int(H/2 + 20)), 85, (45, 95, 55), -1)
            cv2.circle(frame, (int(W/2), int(H/2 + 20)), 85, (80, 140, 90), 2)
            cv2.circle(frame, (int(W/2), int(H/2 + 20)), 150, (60, 70, 80), 2)
        else: # transit
            frame[:] = (40, 50, 60)
            cv2.rectangle(frame, (0, int(H * 0.4)), (W, H), (30, 35, 40), -1)
            # Road dashed lane
            for lx in range(int(f * 25) % 60, W, 60):
                cv2.line(frame, (lx, int(H * 0.7)), (lx + 30, int(H * 0.7)), (220, 220, 220), 2)

        # Draw Animated Tracked Entities (Pedestrians / Vehicles)
        for e in range(cfg['num_entities']):
            if scene == 'plaza':
                # Pedestrians walking
                speed = 40 + e * 15
                dir_x = 1 if e % 2 == 0 else -1
                x = int((W * 0.5 + dir_x * (speed * t + e * 70)) % (W + 80) - 40)
                y = int(H * 0.55 + (e % 3) * 35)
                w_box, h_box = 24, 52
                color = (212, 182, 6) # Cyan in BGR
                label = f"Person {94 + (e % 5)}%"
            elif scene == 'roundabout':
                # Vehicles moving in circular orbit
                angle = t * (0.8 + e * 0.2) + e * 1.3
                radius = 115
                x = int(W/2 + np.cos(angle) * radius)
                y = int(H/2 + 20 + np.sin(angle) * (radius * 0.55))
                w_box, h_box = 44, 26
                color = (166, 99, 36) # Blue in BGR
                label = f"Vehicle {42 + e*3}km/h"
            elif scene == 'market':
                if e == 0:
                    # White SUV parked or passing
                    x = int((t * 55) % (W + 120) - 60)
                    y = int(H * 0.72)
                    w_box, h_box = 54, 30
                    color = (129, 185, 16) # Green
                    label = "CH01AB1234 96%"
                else:
                    x = int((W * 0.2 + (t * 30 + e * 90)) % (W + 60) - 30)
                    y = int(H * 0.52 + (e % 3) * 30)
                    w_box, h_box = 22, 48
                    color = (212, 182, 6)
                    label = f"Person {93 + e}%"
            else: # transit
                x = int((W + 80 - (t * 70 + e * 130)) % (W + 140) - 60)
                y = int(H * 0.65 + (e % 2) * 40)
                w_box, h_box = 58, 34
                color = (129, 185, 16)
                label = "Bus/Transit 95%"

            # Draw tactical box
            cv2.rectangle(frame, (x - int(w_box/2), y - int(h_box/2)), (x + int(w_box/2), y + int(h_box/2)), color, 2)
            cv2.putText(frame, label, (x - int(w_box/2), y - int(h_box/2) - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, color, 1)

        # Telemetry Banner Overlay (Top)
        cv2.rectangle(frame, (0, 0), (W, 28), (15, 23, 35), -1)
        cv2.putText(frame, title, (10, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (240, 245, 250), 1)
        
        # DEMO FEED badge (Top Right)
        cv2.rectangle(frame, (W - 145, 5), (W - 10, 23), (40, 70, 160), -1)
        cv2.putText(frame, "DEMO FEED (PREVIEW)", (W - 140, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1)

        # Dynamic Timestamp Overlay (Bottom Left)
        time_sec = int(14 * 3600 + 32 * 60 + 15 + t)
        hrs = (time_sec // 3600) % 24
        mins = (time_sec % 3600) // 60
        secs = time_sec % 60
        time_str = f"2026-05-18 {hrs:02d}:{mins:02d}:{secs:02d} | 25 FPS | BITRATE: 1.8 Mbps"
        cv2.rectangle(frame, (8, H - 24), (340, H - 6), (15, 23, 35), -1)
        cv2.putText(frame, time_str, (12, H - 11), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 200), 1)

        out.write(frame)
        
    out.release()
    
    # Transcode to standard H.264 MP4 using ffmpeg for universal browser support
    cmd = [
        'ffmpeg', '-y', '-i', raw_path,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        final_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(raw_path):
        os.remove(raw_path)
    print(f"Generated {final_path} ({os.path.getsize(final_path)} bytes)")

print("All 4 demo CCTV videos successfully created.")

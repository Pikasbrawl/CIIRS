import cv2
import numpy as np
import subprocess
import os

os.makedirs('backend/uploads', exist_ok=True)

configs = [
    {
        'code': 'CAM-DEMO-001',
        'raw_name': 'raw_demo_001.mp4',
        'final_name': 'demo_pedestrian_movement.mp4',
        'title': 'CAM-DEMO-001 • Sector 17 Commercial Plaza',
        'zone': 'Sector 17 Commercial Promenade',
        'category': 'Pedestrian Movement',
        'scene': 'plaza',
        'num_entities': 7
    },
    {
        'code': 'CAM-DEMO-002',
        'raw_name': 'raw_demo_002.mp4',
        'final_name': 'demo_road_traffic.mp4',
        'title': 'CAM-DEMO-002 • Sector 22 Market Avenue',
        'zone': 'Sector 22 Shastri Market Road',
        'category': 'Road Traffic',
        'scene': 'traffic',
        'num_entities': 6
    },
    {
        'code': 'CAM-DEMO-003',
        'raw_name': 'raw_demo_003.mp4',
        'final_name': 'demo_traffic_intersection.mp4',
        'title': 'CAM-DEMO-003 • Sector 35 Rotary Intersection',
        'zone': 'Sector 35 Rotary Intersection',
        'category': 'Traffic Intersection',
        'scene': 'intersection',
        'num_entities': 6
    },
    {
        'code': 'CAM-DEMO-004',
        'raw_name': 'raw_demo_004.mp4',
        'final_name': 'demo_public_space.mp4',
        'title': 'CAM-DEMO-004 • Sector 43 Transit Promenade',
        'zone': 'Sector 43 Transit Terminal Area',
        'category': 'Public Space Monitoring',
        'scene': 'transit',
        'num_entities': 5
    },
    {
        'code': 'CAM-DEMO-005',
        'raw_name': 'raw_demo_005.mp4',
        'final_name': 'demo_parking_monitoring.mp4',
        'title': 'CAM-DEMO-005 • Sukhna Lake Parking Terminal',
        'zone': 'Sukhna Lake Waterfront Parking Lot',
        'category': 'Parking Area Monitoring',
        'scene': 'parking',
        'num_entities': 6
    },
    {
        'code': 'CAM-DEMO-006',
        'raw_name': 'raw_demo_006.mp4',
        'final_name': 'demo_building_entrance.mp4',
        'title': 'CAM-DEMO-006 • Panjab University Main Concourse',
        'zone': 'PU Sector 14 Administrative Entrance',
        'category': 'Campus or Building Entrance',
        'scene': 'entrance',
        'num_entities': 6
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
        
        # 1. Background Scene Graphics
        if scene == 'plaza':
            frame[:] = (55, 65, 75)
            cv2.rectangle(frame, (0, 0), (W, int(H * 0.4)), (70, 80, 90), -1)
            for x in range(0, W, 60):
                cv2.line(frame, (x, int(H * 0.4)), (int(x + (x - W/2)*0.8), H), (45, 55, 65), 1)
            for y in range(int(H * 0.4), H, 35):
                cv2.line(frame, (0, y), (W, y), (45, 55, 65), 1)
        elif scene == 'traffic':
            frame[:] = (45, 55, 65)
            # Two-way multilane road
            cv2.rectangle(frame, (0, int(H * 0.3)), (W, H), (30, 35, 40), -1)
            for lx in range(int(f * 35) % 60, W, 60):
                cv2.line(frame, (lx, int(H * 0.65)), (lx + 30, int(H * 0.65)), (230, 230, 230), 2)
            cv2.line(frame, (0, int(H * 0.3)), (W, int(H * 0.3)), (240, 240, 240), 2)
        elif scene == 'intersection':
            frame[:] = (35, 45, 55)
            # Intersection crossroad
            cv2.rectangle(frame, (0, int(H * 0.3)), (W, int(H * 0.7)), (30, 35, 40), -1)
            cv2.rectangle(frame, (int(W * 0.35), 0), (int(W * 0.65), H), (30, 35, 40), -1)
            # Zebra crossing lines
            for zx in range(int(W * 0.35), int(W * 0.65), 18):
                cv2.line(frame, (zx, int(H * 0.3)), (zx, int(H * 0.33)), (255, 255, 255), 2)
                cv2.line(frame, (zx, int(H * 0.67)), (zx, int(H * 0.7)), (255, 255, 255), 2)
        elif scene == 'transit':
            frame[:] = (40, 50, 60)
            cv2.rectangle(frame, (0, int(H * 0.4)), (W, H), (30, 35, 40), -1)
            # Bus lane & passenger curb
            cv2.rectangle(frame, (0, int(H * 0.25)), (W, int(H * 0.4)), (80, 90, 100), -1)
        elif scene == 'parking':
            frame[:] = (45, 50, 55)
            cv2.rectangle(frame, (0, int(H * 0.2)), (W, H), (35, 40, 45), -1)
            # Parking bays angled lines
            for px in range(20, W, 70):
                cv2.line(frame, (px, int(H * 0.3)), (px + 30, int(H * 0.55)), (200, 200, 200), 2)
                cv2.line(frame, (px, int(H * 0.65)), (px + 30, int(H * 0.9)), (200, 200, 200), 2)
        else: # entrance
            frame[:] = (50, 60, 70)
            # Building facade with entrance doors
            cv2.rectangle(frame, (0, 0), (W, int(H * 0.5)), (80, 90, 105), -1)
            cv2.rectangle(frame, (int(W * 0.35), int(H * 0.2)), (int(W * 0.65), int(H * 0.5)), (30, 40, 50), -1)
            cv2.rectangle(frame, (int(W * 0.37), int(H * 0.22)), (int(W * 0.63), int(H * 0.5)), (160, 180, 200), 1)

        # 2. Draw Tracked Entities (Pedestrians / Vehicles)
        for e in range(cfg['num_entities']):
            if scene in ['plaza', 'transit', 'entrance']:
                # Pedestrians
                speed = 35 + e * 12
                dir_x = 1 if e % 2 == 0 else -1
                x = int((W * 0.45 + dir_x * (speed * t + e * 80)) % (W + 80) - 40)
                y = int(H * 0.5 + (e % 3) * 35)
                w_box, h_box = 24, 52
                color = (212, 182, 6) # Cyan
                label = f"Person {93 + (e % 6)}%"
            elif scene == 'parking':
                # Parked vehicles and one moving vehicle
                if e < 4:
                    x = int(50 + e * 140)
                    y = int(H * 0.42 if e % 2 == 0 else H * 0.75)
                    w_box, h_box = 55, 32
                    color = (180, 140, 50)
                    label = f"Parked Car {96 + e}%"
                else:
                    speed = 40
                    x = int((t * speed * 2 + e * 90) % (W + 100) - 50)
                    y = int(H * 0.6)
                    w_box, h_box = 58, 34
                    color = (16, 185, 129)
                    label = f"Moving Car {94}%"
            else:
                # Road vehicles
                speed = 60 + e * 20
                dir_x = 1 if e % 2 == 0 else -1
                lane_y = int(H * 0.45) if dir_x == 1 else int(H * 0.75)
                x = int((dir_x * (t * speed + e * 110)) % (W + 120) - 60)
                if dir_x == -1:
                    x = W - x
                y = lane_y
                w_box, h_box = 60, 32
                color = (16, 185, 129) # Emerald Green
                label = f"Vehicle {95 + (e % 4)}%"

            # Bounding box & shadow
            cv2.rectangle(frame, (x, y), (x + w_box, y + h_box), (0, 0, 0), 2)
            cv2.rectangle(frame, (x, y), (x + w_box, y + h_box), color, 1)
            # Label
            cv2.rectangle(frame, (x, y - 16), (x + len(label)*7 + 4, y), (0, 0, 0), -1)
            cv2.putText(frame, label, (x + 2, y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.32, color, 1, cv2.LINE_AA)

        # 3. Professional CCTV Overlays
        # Top banner with camera info
        cv2.rectangle(frame, (0, 0), (W, 24), (0, 0, 0), -1)
        cv2.circle(frame, (14, 12), 4, (36, 163, 22), -1) # Green REC / Online dot
        cv2.putText(frame, "REC", (24, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, title, (65, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (230, 240, 255), 1, cv2.LINE_AA)
        
        # Timestamp counter (2026-10-30 HH:MM:SS.ms)
        ms = int((t % 1.0) * 100)
        sec = int(t) % 60
        ts_str = f"2026-10-30 14:32:{sec:02d}.{ms:02d} IST"
        cv2.putText(frame, ts_str, (W - 210, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 220, 240), 1, cv2.LINE_AA)
        
        # Bottom Telemetry Strip
        cv2.rectangle(frame, (0, H - 20), (W, H), (0, 0, 0), -1)
        telem_left = f"AI TELEMETRY: ACTIVE | FPS: {FPS} | H.264 HD"
        cv2.putText(frame, telem_left, (10, H - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.33, (160, 180, 200), 1, cv2.LINE_AA)
        
        # Prominent DEMO FOOTAGE badge in bottom-right corner
        cv2.rectangle(frame, (W - 130, H - 18), (W - 10, H - 2), (30, 70, 140), -1)
        cv2.putText(frame, "DEMO FOOTAGE", (W - 124, H - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1, cv2.LINE_AA)

        out.write(frame)

    out.release()
    print(f"Rendered raw: {raw_path}")

    # Convert with ffmpeg to universally playable H.264 baseline MP4
    cmd = [
        'ffmpeg', '-y', '-i', raw_path,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-movflags', '+faststart',
        final_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"H.264 Encoded: {final_path} (Size: {os.path.getsize(final_path)} bytes)")
    
    # Remove raw uncompressed intermediate
    if os.path.exists(raw_path):
        os.remove(raw_path)

print("All 6 CCTV demonstration videos successfully rendered and encoded.")

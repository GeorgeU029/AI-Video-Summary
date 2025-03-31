import os
import numpy as np
import cv2
from glob import glob

def create_dir(path):
    try:
        if not os.path.exists(path):
             os.makedirs(path)
    except OSError:
        print(f"Error: creating directory with name {path}") 

def save_frame(video_path, save_dir, gap=10):
    name = video_path.split("/")[-1].split(".")[0]
    save_path = os.path.join(save_dir, name)
    create_dir(save_path)

    cap = cv2.VideoCapture(video_path)
    idx = 0
    fps = cap.get(cv2.CAP_PROP_FPS)  # Get frames per second

    while True:
        ret, frame = cap.read()

        if ret == False:
            cap.release()
            break
            
        # Calculate timestamp in seconds
        timestamp_seconds = idx / fps
        # Format timestamp as HH:MM:SS
        hours = int(timestamp_seconds // 3600)
        minutes = int((timestamp_seconds % 3600) // 60)
        seconds = int(timestamp_seconds % 60)
        timestamp = f"{hours:02d}_{minutes:02d}_{seconds:02d}"
        
        if idx == 0 or idx % gap == 0:
            cv2.imwrite(f"{save_path}/frame_{timestamp}.png", frame)
        
        idx += 1

if __name__ == "__main__":
    video_paths = glob("videos/*")
    save_dir = "save"

    for path in video_paths:
        save_frame(path,save_dir,gap = 10)
        
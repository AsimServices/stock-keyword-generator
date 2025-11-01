import base64
import io
import tempfile
import os
from PIL import Image
import subprocess
import json

def extract_frames_from_video(video_base64_data, num_frames=5, max_file_size_mb=50):
    """
    Extract frames from a base64 encoded video using FFmpeg
    
    Args:
        video_base64_data (str): Base64 encoded video data
        num_frames (int): Number of frames to extract (default: 5)
        max_file_size_mb (int): Maximum video file size in MB (default: 50)
    
    Returns:
        dict: Success status, frames list, and video info
    """
    try:
        # Decode base64 video data
        video_data = base64.b64decode(video_base64_data)
        
        # Check file size
        file_size_mb = len(video_data) / (1024 * 1024)
        if file_size_mb > max_file_size_mb:
            raise ValueError(f"Video file too large: {file_size_mb:.1f}MB (max: {max_file_size_mb}MB)")
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_video:
            temp_video.write(video_data)
            temp_video_path = temp_video.name
        
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Get video info using FFprobe
            probe_cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams',
                temp_video_path
            ]
            
            try:
                probe_result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=30)
                if probe_result.returncode != 0:
                    raise ValueError("Could not read video file")
                
                video_info_raw = json.loads(probe_result.stdout)
                
                # Extract video stream info
                video_stream = None
                for stream in video_info_raw.get('streams', []):
                    if stream.get('codec_type') == 'video':
                        video_stream = stream
                        break
                
                if not video_stream:
                    raise ValueError("No video stream found")
                
                duration = float(video_stream.get('duration', 0))
                fps = eval(video_stream.get('r_frame_rate', '25/1'))  # Convert fraction to float
                total_frames = int(video_stream.get('nb_frames', duration * fps))
                
            except (subprocess.TimeoutExpired, subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError):
                # Fallback: assume reasonable defaults
                duration = 10.0
                fps = 25.0
                total_frames = 250
            
            # Calculate time points for frame extraction
            if duration <= 0:
                duration = 10.0  # Fallback duration
            
            time_points = []
            for i in range(num_frames):
                time_point = (i * duration) / max(num_frames - 1, 1)
                time_points.append(time_point)
            
            extracted_frames = []
            
            # Extract frames using FFmpeg
            for i, time_point in enumerate(time_points):
                output_path = os.path.join(temp_dir, f'frame_{i:03d}.jpg')
                
                ffmpeg_cmd = [
                    'ffmpeg', '-i', temp_video_path, '-ss', str(time_point), 
                    '-vframes', '1', '-y', '-q:v', '2', output_path
                ]
                
                try:
                    subprocess.run(ffmpeg_cmd, capture_output=True, timeout=10)
                    
                    if os.path.exists(output_path):
                        # Load and process the frame
                        with Image.open(output_path) as img:
                            # Convert to RGB if needed
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            
                            # Resize if too large
                            max_size = 1024
                            if img.width > max_size or img.height > max_size:
                                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                            
                            # Convert to base64
                            img_buffer = io.BytesIO()
                            img.save(img_buffer, format='JPEG', quality=85)
                            img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                            
                            extracted_frames.append(img_base64)
                        
                        # Clean up frame file
                        os.unlink(output_path)
                        
                except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
                    continue
            
            # If no frames extracted with FFmpeg, create a placeholder
            if not extracted_frames:
                # Create a simple placeholder image
                placeholder = Image.new('RGB', (640, 480), color='gray')
                img_buffer = io.BytesIO()
                placeholder.save(img_buffer, format='JPEG', quality=85)
                img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                extracted_frames = [img_base64] * min(num_frames, 3)
                
                return {
                    "success": True,
                    "frames": extracted_frames,
                    "video_info": {
                        "total_frames": len(extracted_frames),
                        "duration_seconds": duration,
                        "fps": fps,
                        "extracted_frame_count": len(extracted_frames)
                    },
                    "note": "Used placeholder frames - install FFmpeg for better frame extraction"
                }
            
            return {
                "success": True,
                "frames": extracted_frames,
                "video_info": {
                    "total_frames": total_frames,
                    "duration_seconds": duration,
                    "fps": fps,
                    "extracted_frame_count": len(extracted_frames)
                }
            }
            
        finally:
            # Clean up temporary files
            try:
                os.unlink(temp_video_path)
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
            except:
                pass
                
    except Exception as e:
        return {
            "success": False,
            "error": f"Frame extraction failed: {str(e)}",
            "frames": []
        }

def analyze_frames_with_service(frames, analyze_function, api_key, system_prompt, model, filename="video_frame.jpg"):
    """
    Analyze extracted frames using a specific AI service
    
    Args:
        frames (list): List of base64 encoded frame images
        analyze_function: Function to analyze each frame
        api_key (str): API key for the service
        system_prompt (str): System prompt for analysis
        model (str): Model to use for analysis
        filename (str): Filename for context (default: "video_frame.jpg")
    
    Returns:
        dict: Combined analysis results
    """
    if not frames:
        return {
            "success": False,
            "error": "No frames to analyze",
            "service": "Frame Analysis"
        }
    
    try:
        frame_results = []
        combined_insights = []
        
        # Analyze each frame
        all_titles = []
        all_keywords = []
        
        for i, frame_data in enumerate(frames):
            # Call image analysis function with all required parameters
            result = analyze_function(frame_data, api_key, system_prompt, "", model, f"{filename}_frame_{i+1}")
            
            if result.get("success"):
                title = result.get("title", "")
                keywords = result.get("keywords", [])
                
                if title:
                    all_titles.append(title)
                if keywords:
                    all_keywords.extend(keywords)
                
                frame_results.append({
                    "frame_number": i + 1,
                    "title": title,
                    "keywords": keywords,
                    "success": True
                })
            else:
                frame_results.append({
                    "frame_number": i + 1,
                    "error": result.get('error', 'Unknown error'),
                    "success": False
                })
        
        # Create combined analysis
        if all_titles or all_keywords:
            # Combine titles - use the most descriptive one or combine them
            combined_title = ""
            if all_titles:
                # Use the longest/most descriptive title, or combine unique elements
                unique_titles = list(dict.fromkeys(all_titles))  # Remove duplicates while preserving order
                if len(unique_titles) == 1:
                    combined_title = unique_titles[0]
                else:
                    # Take the longest title as it's likely most descriptive
                    combined_title = max(unique_titles, key=len)
            
            # Combine keywords - remove duplicates and limit to reasonable number
            combined_keywords = []
            if all_keywords:
                # Remove duplicates while preserving order and limit to 50 keywords
                seen = set()
                for keyword in all_keywords:
                    if keyword.lower() not in seen and len(combined_keywords) < 50:
                        seen.add(keyword.lower())
                        combined_keywords.append(keyword)
            
            return {
                "success": True,
                "title": combined_title,
                "keywords": combined_keywords,
                "frame_results": frame_results,
                "frames_analyzed": len(frames),
                "service": "Frame-based Analysis"
            }
        else:
            return {
                "success": False,
                "error": "All frame analyses failed",
                "service": "Frame Analysis"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Frame analysis processing failed: {str(e)}",
            "service": "Frame Analysis"
        }

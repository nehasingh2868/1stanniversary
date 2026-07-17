import http.server
import socketserver
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from urllib.parse import urlparse

PORT = 8000

# Load environment variables from .env if it exists
env_vars = {}
if os.path.exists('.env'):
    with open('.env', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                parts = line.strip().split('=', 1)
                if len(parts) == 2:
                    env_vars[parts[0].strip()] = parts[1].strip()

GMAIL_EMAIL = env_vars.get('GMAIL_EMAIL', 'nikkxo1999@gmail.com')
GMAIL_APP_PASSWORD = env_vars.get('GMAIL_APP_PASSWORD', '')

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/send-email':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Load environment variables dynamically on every request
            env_vars = {}
            if os.path.exists('.env'):
                with open('.env', 'r') as f:
                    for line in f:
                        if '=' in line and not line.startswith('#'):
                            parts = line.strip().split('=', 1)
                            if len(parts) == 2:
                                env_vars[parts[0].strip()] = parts[1].strip()
            
            gmail_email = env_vars.get('GMAIL_EMAIL', 'nikkxo1999@gmail.com')
            gmail_app_password = env_vars.get('GMAIL_APP_PASSWORD', '')
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                recipient = data.get('email')
                coupon_title = data.get('coupon')
                
                if not recipient or not coupon_title:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Missing parameters'}).encode('utf-8'))
                    return
                
                # Check for SMTP Configuration
                if not gmail_app_password:
                    print("WARNING: GMAIL_APP_PASSWORD is not configured in .env file!")
                    print(f"Simulating email dispatch of '{coupon_title}' to {recipient}...")
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'simulated', 'message': 'Email simulated (GMAIL_APP_PASSWORD missing)'}).encode('utf-8'))
                    return
                
                # Setup SMTP
                msg = MIMEMultipart()
                msg['From'] = gmail_email
                msg['To'] = recipient
                msg['Subject'] = f"Your Anniversary Coupon: {coupon_title}"
                
                body = f"Hi Pankaj,\n\nCongratulations! Neha has credited you the following romantic coupon:\n\n👉 {coupon_title} 👈\n\nDon't miss the chance to use it and have fun!!!\n\nLove,\nNeha"
                msg.attach(MIMEText(body, 'plain'))
                
                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(gmail_email, gmail_app_password)
                server.sendmail(gmail_email, recipient, msg.as_string())
                server.quit()
                
                print(f"Email sent successfully to {recipient} for '{coupon_title}'!")
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
                
            except Exception as e:
                print("Email dispatch error:", e)
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

# Start simple web server serving files from the current working directory
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Serving Our Love Diary at http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    httpd.serve_forever()

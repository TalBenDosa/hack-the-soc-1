
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Award, Calendar, User, FileImage } from 'lucide-react';

export default function CertificateGenerator({ 
  isOpen, 
  onClose, 
  studentName, 
  courseName,
  completionDate,
  score,
  certificateType = "completion" 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const formattedDate = completionDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const generateCertificateHTML = () => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Certificate - ${studentName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #000000;
            color: #E2E8F0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .certificate-container {
            background: #000000;
            width: 100%;
            max-width: 800px;
            padding: 40px;
            box-sizing: border-box;
          }
          .certificate-border {
            border: 2px solid #14B8A6;
            padding: 40px;
            text-align: center;
            position: relative;
          }
          .platform-name {
            font-size: 42px; /* Increased from 36px */
            font-weight: 700;
            color: #14B8A6;
            margin-bottom: 15px; /* Increased from 8px */
            margin-top: 30px; /* Pushes content down */
          }
          .completion-title {
            font-size: 20px;
            font-weight: 600;
            color: #FFFFFF;
            margin-bottom: 60px; /* Increased space after this title */
          }
          .main-text {
            font-size: 16px;
            line-height: 1.6;
            color: #CBD5E1;
            margin: 20px 0;
          }
          .recipient-name {
            font-size: 42px;
            font-weight: 700;
            color: #14B8A6;
            margin: 10px 0;
          }
          .exam-name {
            font-size: 24px;
            font-weight: 600;
            color: #FFFFFF;
            margin: 10px 0;
          }
          .footer {
            margin-top: 70px; /* Increased space before the date */
            font-size: 14px;
            color: #94A3B8;
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <div class="certificate-border">
            <div class="platform-name">Hack The SOC</div>
            <div class="completion-title">Certificate of Completion</div>
            
            <p class="main-text">This certifies that</p>
            
            <div class="recipient-name">${studentName}</div>
            
            <p class="main-text">has successfully completed</p>
            
            <div class="exam-name">${courseName}</div>
            
            <div class="footer">
              ${formattedDate}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const generateCertificateFile = async () => {
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const certificateHTML = generateCertificateHTML();

    const blob = new Blob([certificateHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificate-${courseName.replace(/\s+/g, '_')}-${studentName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsGenerating(false);
    
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const generateCertificatePNG = async () => {
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      // Create a temporary iframe to render the certificate
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '600px'; // Adjusted height for better proportions
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(generateCertificateHTML());
      iframeDoc.close();
      
      // Wait for fonts to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Convert to canvas using html2canvas-like approach
      // Since we can't import html2canvas, we'll create a simple canvas implementation
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600; // Adjusted height
      const ctx = canvas.getContext('2d');
      
      // Fill with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 800, 600);
      
      // Draw border
      ctx.strokeStyle = '#14B8A6';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, 720, 520); // Adjusted height
      
      // Set font and colors for text
      ctx.textAlign = 'center';
      
      // Replicating the on-screen preview with updated positions and font sizes
      ctx.fillStyle = '#14B8A6';
      ctx.font = 'bold 42px Inter, sans-serif'; // Updated font size and Y position
      ctx.fillText('Hack The SOC', 400, 140); 

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 20px Inter, sans-serif';
      ctx.fillText('Certificate of Completion', 400, 180);

      // Increased gap after "Certificate of Completion"
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('This certifies that', 400, 260); // Adjusted Y position
      
      ctx.fillStyle = '#14B8A6'; // User name in Teal
      ctx.font = 'bold 42px Inter, sans-serif';
      ctx.fillText(studentName, 400, 310); // Adjusted Y position
      
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('has successfully completed', 400, 360); // Adjusted Y position
      
      ctx.fillStyle = '#FFFFFF'; // Exam name in White
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText(courseName, 400, 400); // Adjusted Y position
      
      // Increased gap before the date
      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(formattedDate, 400, 500); // Adjusted Y position
      
      // Download as PNG
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Certificate-${courseName.replace(/\s+/g, '_')}-${studentName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
      
      // Clean up
      document.body.removeChild(iframe);
      
    } catch (error) {
      console.error('Error generating PNG:', error);
      // Fallback to HTML download
      await generateCertificateFile();
    }
    
    setIsGenerating(false);
    
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Award className="w-8 h-8 text-yellow-400" />
            Certificate Generator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="bg-black border border-teal-500/30 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-teal-400 mb-2">Hack The SOC</div> {/* Adjusted mb-4 to mb-2 */}
            <h3 className="text-xl font-bold text-white mb-6">Certificate of Completion</h3> {/* Adjusted mb-4 to mb-6 */}
            <p className="text-slate-300 mb-2">This certifies that</p> {/* Adjusted mb-4 to mb-2 */}
            <p className="text-4xl font-bold text-teal-400 mb-2">{studentName}</p> {/* Adjusted mb-4 to mb-2 */}
            <p className="text-slate-300 mb-2">has successfully completed</p>
            <p className="text-lg font-semibold text-white mb-6">{courseName}</p> {/* Adjusted mb-4 to mb-6 */}
            
            <div className="flex justify-center items-center gap-6 text-sm text-slate-400 mt-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formattedDate}
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-slate-300">
              Choose your preferred format to download the certificate.
            </p>
            
            <div className="flex justify-center gap-4">
              <Button 
                onClick={onClose} 
                variant="outline" 
                className="border-slate-600 text-slate-300"
                disabled={isGenerating}
              >
                Cancel
              </Button>
              
              <Button 
                onClick={generateCertificatePNG}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileImage className="w-4 h-4 mr-2" />
                    Download PNG
                  </>
                )}
              </Button>

              <Button 
                onClick={generateCertificateFile}
                className="bg-teal-600 hover:bg-teal-700"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download HTML
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

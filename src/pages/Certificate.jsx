import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Shield, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Signature component
const Signature = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 500 100" 
        className="w-32 h-16 text-slate-300"
    >
        <path 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3"
            d="M20,70 Q50,20 100,50 T200,60 Q220,80 250,50 T350,70 Q400,30 480,80" 
        />
    </svg>
);


export default function Certificate() {
    const certificateRef = useRef();
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const studentName = urlParams.get('studentName') || 'Valued Student';
    const courseName = urlParams.get('courseName') || 'Cybersecurity Principles';
    const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // State to manage whether the PDF has been generated and downloaded
    const [isPdfGenerated, setIsPdfGenerated] = useState(false);

    useEffect(() => {
        // Only generate PDF once on component mount
        generatePdf();
    }, []);

    const generatePdf = () => {
        const input = certificateRef.current;
        if (input) {
            html2canvas(input, {
                scale: 2,
                useCORS: true,
                backgroundColor: null, 
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'pt',
                    format: 'a4'
                });
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Certificate-${studentName.replace(/ /g, '_')}.pdf`);
                setIsPdfGenerated(true); // Set state to true after PDF is saved
            }).catch(error => {
                console.error("Error generating PDF:", error);
                // In a real application, you might want to show an error message to the user here.
            });
        }
    };

    const handleShareOnLinkedIn = () => {
        // Construct the LinkedIn share URL for a new post with pre-filled text
        const shareText = encodeURIComponent(`I'm excited to share that I've successfully completed the "${courseName}" quiz and earned my certificate from Hack The SOC! 🎉 #Cybersecurity #HackTheSOC #Certificate #QuizCompletion`);
        window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${shareText}`, '_blank');
    };

    return (
        <>
            {/* This div remains hidden and is used only for generating the PDF image */}
            <div className="fixed top-[-9999px] left-[-9999px] w-[842px] h-[595px] overflow-hidden">
                <div 
                    ref={certificateRef} 
                    style={{ width: '842px', height: '595px' }} 
                    className="bg-slate-900 text-white p-10 flex flex-col justify-between items-center relative"
                >
                    {/* Decorative border */}
                    <div className="absolute inset-0 border-8 border-teal-500/30 rounded-lg"></div>

                    <div className="w-full flex justify-center items-center flex-col z-10">
                        <div className="bg-teal-500/20 p-4 rounded-full border-2 border-teal-500 mb-2">
                            <Shield className="w-10 h-10 text-teal-400" />
                        </div>
                        <span className="font-bold text-2xl text-slate-200">Hack The SOC</span>
                    </div>

                    <div className="text-center my-4 z-10">
                        <p className="text-slate-300 text-lg mb-4">This is to certify that</p>
                        <h1 className="text-5xl font-bold text-teal-400 mb-4">{studentName}</h1>
                        <p className="text-slate-300 text-lg">
                            has successfully completed the quiz
                        </p>
                        <h2 className="text-3xl font-semibold text-white mt-2">{courseName}</h2>
                        <div className="mt-6 w-32 h-1 bg-teal-500 mx-auto rounded-full"></div>
                    </div>

                    <div className="w-full flex justify-between items-end z-10">
                        <div className="text-left">
                            <p className="text-slate-500 text-xs">Issued on</p>
                            <p className="text-slate-300 text-sm font-medium">{issueDate}</p>
                        </div>
                        <div className="text-center">
                            <Signature />
                            <p className="font-semibold text-slate-200 border-t-2 border-slate-600 px-4 pt-1">Lead Instructor</p>
                            <p className="text-xs text-slate-500">Hack The SOC Academy</p>
                        </div>
                         <div className="text-right">
                            <p className="text-slate-500 text-xs">Certificate ID</p>
                            <p className="text-slate-400 text-sm font-mono">CERT-{Date.now()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* This div displays content to the user while/after the PDF is generated */}
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                {!isPdfGenerated ? (
                    <div className="text-center">
                        <p className="text-lg mb-4">Generating your certificate...</p>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                    </div>
                ) : (
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-teal-400 mb-4">Certificate Downloaded!</h2>
                        <p className="text-lg mb-6">Your certificate for "{courseName}" has been successfully downloaded. Celebrate your achievement!</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={handleShareOnLinkedIn}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center transition duration-300 ease-in-out"
                            >
                                {/* LinkedIn icon SVG for better accessibility and styling */}
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path>
                                </svg>
                                Share on LinkedIn
                            </button>
                            <button
                                onClick={() => navigate(createPageUrl('Dashboard'))}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center transition duration-300 ease-in-out"
                            >
                                <LayoutDashboard className="w-5 h-5 mr-2" />
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
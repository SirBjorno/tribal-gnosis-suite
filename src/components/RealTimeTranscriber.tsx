import React, { useState, useEffect, useRef } from 'react';
import { CloudIcon, MicrophoneIcon } from './Icons';
import type { LiveCall } from '../types';

// Define interfaces for the Web Speech API to satisfy TypeScript and resolve type errors.
// These types are not always included in default DOM typings.
interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    start(): void;
    stop(): void;
}
  
interface SpeechRecognitionEvent {
    resultIndex: number;
    results: {
        isFinal: boolean;
        [key: number]: {
            transcript: string;
        };
    }[];
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

// A simple pulsing icon for recording state
const RecordingIcon = () => (
    <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
    </span>
);

interface RealTimeTranscriberProps {
    onTranscriptReady: (transcript: string) => void;
    onAnalyze: () => void;
    isAnalyzing: boolean;
    isOnline: boolean;
    liveCall: LiveCall | null;
}

const RealTimeTranscriber: React.FC<RealTimeTranscriberProps> = ({ onTranscriptReady, onAnalyze, isAnalyzing, isOnline, liveCall }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [transcript, setTranscript] = useState('');
    const [isLiveTyping, setIsLiveTyping] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const accumulatedTranscriptRef = useRef('');
    const isRecordingRef = useRef(isRecording);
    isRecordingRef.current = isRecording;

    // --- Live Call Simulation Effect ---
    useEffect(() => {
        if (liveCall) {
            let currentIndex = 0;
            let fullText = '';
            setIsLiveTyping(true);

            const typeNextLine = () => {
                if (currentIndex < liveCall.dialogue.length) {
                    const nextLine = liveCall.dialogue[currentIndex];
                    fullText += (fullText ? '\n' : '') + nextLine;
                    setTranscript(fullText);
                    currentIndex++;
                    setTimeout(typeNextLine, 1200); // Delay between lines
                } else {
                    setIsLiveTyping(false);
                }
            };
            typeNextLine();
        } else {
            // Reset when live call ends
            setTranscript('');
            setIsLiveTyping(false);
        }
    }, [liveCall]);


    // --- Microphone Recording Effect ---
    useEffect(() => {
        // Don't initialize microphone if this is a live call simulation
        if (liveCall) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition: SpeechRecognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcriptPart = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    accumulatedTranscriptRef.current += transcriptPart + ' ';
                } else {
                    interimTranscript += transcriptPart;
                }
            }
             // Display both final and interim results for real-time feedback
            setTranscript(accumulatedTranscriptRef.current + interimTranscript);
        };
        
        recognition.onend = () => {
            if (isRecordingRef.current) {
                try {
                  recognition.start();
                } catch (error) {
                  console.error("Error restarting recognition:", error);
                }
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error", event.error);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.stop();
            }
        };
    }, [liveCall]); // Re-run if liveCall status changes

    // Propagate the final transcript up when it changes
    useEffect(() => {
        onTranscriptReady(transcript);
    }, [transcript, onTranscriptReady]);

    const toggleRecording = () => {
        if (!recognitionRef.current || liveCall) return;

        const nextIsRecording = !isRecording;
        setIsRecording(nextIsRecording);

        if (nextIsRecording) {
            accumulatedTranscriptRef.current = '';
            setTranscript(''); 
            recognitionRef.current.start();
        } else {
            recognitionRef.current.stop();
        }
    };

    if (!isSupported && !liveCall) {
        return (
             <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
                <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 rounded-md">
                    <p className="font-bold">Unsupported Browser</p>
                    <p>Real-time transcription is not supported in your browser. Please use a modern browser like Chrome or Edge.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {liveCall ? "Live Call Transcription" : "Live Transcript Analyzer"}
            </h2>
            <div className="flex flex-col items-center gap-4">
                <button
                    onClick={toggleRecording}
                    disabled={isAnalyzing || !!liveCall}
                    className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'
                    }`}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    {liveCall ? <CloudIcon className="h-10 w-10" /> : <MicrophoneIcon className="h-10 w-10" />}
                    {(isRecording || isLiveTyping) && (
                        <div className="absolute top-2 right-2">
                            <RecordingIcon />
                        </div>
                    )}
                </button>
                <p className="text-sm font-semibold text-slate-600">
                    {isAnalyzing ? 'Analyzing...' :
                     liveCall ? 'Live sync from Microsoft Teams...' :
                     isRecording ? 'Listening...' : 'Click the microphone to start'}
                </p>
            </div>
            <div className="mt-4 bg-slate-100 p-3 border border-slate-200/80 rounded-md min-h-[150px] max-h-64 overflow-y-auto">
                {transcript ? (
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{transcript}</p>
                ) : (
                    <p className="text-slate-400">
                        {liveCall ? "Waiting for live transcript from Teams..." : "Your transcribed text will appear here..."}
                    </p>
                )}
            </div>
             <button
                onClick={onAnalyze}
                disabled={isAnalyzing || isRecording || !isOnline || !transcript.trim() || isLiveTyping}
                title={!isOnline ? "Cannot analyze: internet is offline" : (isRecording ? "Stop recording before analyzing" : "")}
                className="mt-4 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Transcript'}
              </button>
        </div>
    );
};

export default RealTimeTranscriber;

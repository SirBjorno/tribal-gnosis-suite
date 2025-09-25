import React, { useState } from 'react';
import type { ReviewItem, LiveCall, Tab } from '../types';
import InfoMessage from '../components/InfoMessage';
import { CloudIcon, PuzzleIcon } from '../components/Icons';

// A more realistic Microsoft Teams icon
const MicrosoftTeamsIcon: React.FC<{ className?: string }> = ({ className = 'h-12 w-12' }) => (
  <svg className={className} viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8.7 17.7a.4.4 0 0 1-.4.4H4.3a.4.4 0 0 1-.4-.4V14a.4.4 0 0 1 .4-.4h4a.4.4 0 0 1 .4.4v3.7zM9.9 13.6V8.8a.6.6 0 0 0-.6-.6H4.3a.6.6 0 0 0-.6.6v4.8h6.2z"
      fill="#fff"
    ></path>
    <path
      d="M12.9 17.7a.4.4 0 0 1-.4.4h-3V14a.4.4 0 0 1 .4-.4h3.4c.2 0 .4.2.4.4v3.3a.4.4 0 0 1-.4.4h-.4z"
      fill="#9297e2"
    ></path>
    <path
      d="M16.7 13.2a.6.6 0 0 0-.6-.6h-5.6V8.8a.6.6 0 0 1 .6-.6h5.6a.6.6 0 0 1 .6.6v4.4zM8.1 7.8v-.6a1 1 0 0 1 1-1h6.6a1 1 0 0 1 1 1v6.6a1 1 0 0 1-1-1H9.1a1 1 0 0 1-1-1V8.1h.1z"
      fill="#464EB8"
    ></path>
    <path
      d="M8.1 8.2v5.1a1 1 0 0 0 1 1h6.6a1 1 0 0 0 1-1V7.2a1 1 0 0 0-1-1H9.1a1 1 0 0 0-1 1v1z"
      fill="#505ac9"
    ></path>
    <path d="M8.2 8.2a.6.6 0 0 0-.6.6v4.8h6.2V8.8a.6.6 0 0 0-.6-.6H8.2z" fill="#7b83eb"></path>
    <path d="M8.7 13.6V9.9c0-.2-.2-.4-.4-.4H4.3a.4.4 0 0 0-.4.4v4.1h5.2v-.4z" fill="#7b83eb"></path>
  </svg>
);

const sampleLiveDialogue = [
  'Agent: Hello, thank you for calling Globex Inc. My name is Alex. How can I assist you today?',
  "Customer: Hi Alex, my name is Samantha Jones, and my account number is 555-4321. I'm having trouble with my internet connection. It keeps dropping every few minutes.",
  "Agent: I'm sorry to hear that, Ms. Jones. I can definitely look into that for you. Can you tell me if the lights on your router are blinking in any unusual way?",
  "Customer: Yes, the 'internet' light is flashing orange, but the 'power' and 'Wi-Fi' lights are solid green.",
  'Agent: Thank you for that information. An orange flashing light usually indicates a signal issue from our end. Let me run a quick diagnostic on your line. This should only take a moment.',
  "Customer: Okay, I'll wait.",
  "Agent: Alright, the diagnostic shows some instability. I'm going to perform a remote reset of your connection. This will cause your internet to go down for about 3-5 minutes. Is that okay?",
  "Customer: Yes, that's fine. Go ahead.",
  "Agent: The reset has been initiated. I'll stay on the line with you until it's complete.",
  'Customer: Great, thank you.',
  "Agent: You're welcome. It looks like the reset is complete. Can you tell me what the lights on your router look like now?",
  "Customer: They're all solid green now!",
  'Agent: Perfect! That indicates the connection is stable. Are you able to browse a website?',
  'Customer: Let me check... yes, it seems to be working much faster. The problem is solved!',
  "Agent: I'm glad to hear that! Is there anything else I can help you with today?",
  'Customer: No, that was it. Thank you for your help, Alex.',
  "Agent: You're very welcome, Ms. Jones. Have a great day!",
];

interface IntegrationsTabProps {
  setReviewItems: React.Dispatch<React.SetStateAction<ReviewItem[]>>;
  setActiveTab: (tab: Tab) => void;
  setLiveCall: React.Dispatch<React.SetStateAction<LiveCall | null>>;
}

const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  setReviewItems,
  setActiveTab,
  setLiveCall,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLiveEnabled, setIsLiveEnabled] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleConnect = () => {
    setSuccessMessage(
      'Simulating connection... You would be redirected to Microsoft to authorize access.'
    );
    setTimeout(() => {
      setIsConnected(true);
      setSuccessMessage(
        'Successfully connected to Microsoft Teams. You can now enable integrations.'
      );
    }, 2000);
  };

  const handleSimulateLiveCall = () => {
    setLiveCall({ source: 'teams', dialogue: sampleLiveDialogue });
    setActiveTab('analyzer');
  };

  const handleDismissSuccess = () => {
    setSuccessMessage(null);
  };

  return (
    <div className="space-y-8">
      {successMessage && <InfoMessage message={successMessage} onDismiss={handleDismissSuccess} />}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Integrations</h2>
        <p className="text-slate-600">
          Connect Tribal Gnosis to other services to automate your workflows.
        </p>

        <div className="mt-6 border-t border-slate-200/80 pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0">
              <MicrosoftTeamsIcon />
            </div>
            <div className="flex-grow">
              <h3 className="text-xl font-bold text-slate-800">Microsoft Teams</h3>
              <p className="text-slate-500 mt-1">
                Automatically pull call logs or transcribe calls in real-time from your
                organization's Teams environment.
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              {!isConnected && (
                <button
                  onClick={handleConnect}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-transparent font-semibold rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                >
                  Connect
                </button>
              )}
              {isConnected && (
                <div className="text-sm text-green-700 font-semibold p-2">Status: Connected</div>
              )}
            </div>
          </div>
          {isConnected && (
            <div className="mt-4 bg-slate-50/70 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800">
                    Enable real-time transcription for incoming Teams calls
                  </h4>
                  <p className="text-sm text-slate-500">
                    Automatically start a live analysis session for new calls.
                  </p>
                </div>
                <button
                  type="button"
                  className={`${isLiveEnabled ? 'bg-sky-600' : 'bg-slate-300'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2`}
                  role="switch"
                  aria-checked={isLiveEnabled}
                  onClick={() => setIsLiveEnabled(!isLiveEnabled)}
                >
                  <span
                    className={`${isLiveEnabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>

              {isLiveEnabled && (
                <div className="mt-4 border-t border-slate-200/80 pt-4">
                  <p className="text-sm text-slate-600 mb-2">
                    Status: Listening for incoming Teams calls...
                  </p>
                  <button
                    onClick={handleSimulateLiveCall}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                  >
                    <CloudIcon /> Simulate Incoming Teams Call
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-slate-200/80 pt-6 opacity-60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0">
              <PuzzleIcon />
            </div>
            <div className="flex-grow">
              <h3 className="text-xl font-bold text-slate-800">Teams App Add-in</h3>
              <p className="text-slate-500 mt-1">
                Use Tribal Gnosis directly inside Microsoft Teams for a seamless workflow. Get
                notifications, review summaries, and search the knowledge base without leaving
                Teams.
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              <button
                disabled
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-transparent font-semibold rounded-md text-white bg-slate-400 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsTab;

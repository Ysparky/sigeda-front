import { useEffect, useRef, useState } from "react";

interface SnackbarProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export function Snackbar({
  message,
  type,
  onClose,
  duration = 5000,
}: SnackbarProps) {
  const [progress, setProgress] = useState(100);
  const progressInterval = useRef<number>();
  const timeoutRef = useRef<number>();

  useEffect(() => {
    const progressDuration = duration - 100;
    const updateInterval = 24;
    const steps = progressDuration / updateInterval;
    const decrementPerStep = 100 / steps;
    let currentProgress = 100;

    progressInterval.current = window.setInterval(() => {
      currentProgress -= decrementPerStep;
      if (currentProgress <= 0) {
        currentProgress = 0;
        if (progressInterval.current) clearInterval(progressInterval.current);
      }
      setProgress(currentProgress);
    }, updateInterval);

    timeoutRef.current = window.setTimeout(onClose, duration);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, onClose]);

  const handleMouseEnter = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleMouseLeave = () => {
    const remainingTime = (progress / 100) * duration;
    const progressDuration = remainingTime - 100;
    const updateInterval = 24;
    const steps = progressDuration / updateInterval;
    const decrementPerStep = progress / steps;
    let currentProgress = progress;

    progressInterval.current = window.setInterval(() => {
      currentProgress -= decrementPerStep;
      if (currentProgress <= 0) {
        currentProgress = 0;
        if (progressInterval.current) clearInterval(progressInterval.current);
      }
      setProgress(currentProgress);
    }, updateInterval);

    timeoutRef.current = window.setTimeout(onClose, remainingTime);
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 animate-fade-in"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`rounded-lg p-4 flex flex-col shadow-lg ${
          type === "success" ? "bg-green-50" : "bg-red-50"
        }`}
      >
        <div
          className={`absolute top-0 left-0 h-1 rounded-t-lg transition-all duration-100 ${
            type === "success" ? "bg-green-400" : "bg-red-400"
          }`}
          style={{ width: `${progress}%` }}
        />

        <div className="flex items-center">
          <div className="flex-shrink-0">
            {type === "success" ? (
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div
            className={`ml-3 ${
              type === "success" ? "text-green-800" : "text-red-800"
            }`}
          >
            <p className="text-sm font-medium">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onClose}
              className={`inline-flex text-${
                type === "success" ? "green" : "red"
              }-400 hover:text-${
                type === "success" ? "green" : "red"
              }-500 focus:outline-none`}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import type { TrackingInfo, TrackingEvent } from '../types';

interface TrackingDisplayProps {
  trackingInfo: TrackingInfo;
  geminiSummary: string | null;
}

const InfoPill: React.FC<{label: string; value: string | undefined; icon?: React.ReactNode}> = ({ label, value, icon }) => (
  <div className="bg-slate-700 p-3 rounded-lg shadow">
    <div className="text-xs text-sky-300 mb-1 flex items-center">
      {icon && <span className="mr-1.5">{icon}</span>}
      {label}
    </div>
    <div className="text-sm font-semibold text-slate-100 break-words">{value || 'N/A'}</div>
  </div>
);

const EventCard: React.FC<{event: TrackingEvent; isLast: boolean}> = ({ event, isLast }) => (
  <li className="relative pb-8 pl-6 border-l-2 border-slate-600">
    {!isLast && <div className="absolute w-px h-full bg-slate-600 left-[-1px] top-2"></div>}
    <div className="absolute -left-[9px] top-0.5 w-4 h-4 bg-sky-500 rounded-full border-2 border-slate-800"></div>
    <div className="ml-4">
      <h4 className="font-semibold text-sky-400">{event.status}</h4>
      <p className="text-xs text-slate-400">{new Date(event.timestamp).toLocaleString()}</p>
      <p className="text-sm text-slate-300">{event.location}</p>
      {event.details && <p className="text-xs text-slate-400 mt-1">{event.details}</p>}
    </div>
  </li>
);

export const TrackingDisplay: React.FC<TrackingDisplayProps> = ({ trackingInfo, geminiSummary }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation shortly after mount to ensure initial styles are applied before transition starts.
    // requestAnimationFrame is a good way to defer to the next paint cycle.
    const animationFrameId = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(animationFrameId); // Cleanup on unmount
  }, []); // Empty dependency array ensures this runs only once on mount

  const baseClasses = "mt-8 p-6 bg-slate-800 rounded-xl shadow-2xl transition-all duration-500 ease-out";
  const animationClasses = isVisible 
    ? 'opacity-100 translate-y-0' 
    : 'opacity-0 translate-y-[10px]'; // Replicates original animation: 10px upward translation

  return (
    <div className={`${baseClasses} ${animationClasses}`}>
      {geminiSummary && (
        <div className="mb-6 p-4 bg-sky-800/50 border border-sky-700 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-sky-300 mb-2">AI Summary ✨</h3>
          <p className="text-slate-200 whitespace-pre-wrap">{geminiSummary}</p>
        </div>
      )}

      <h2 className="text-2xl font-bold text-sky-400 mb-6">Tracking Details for {trackingInfo.id}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <InfoPill label="Current Status" value={trackingInfo.currentStatus} />
        <InfoPill label="Carrier" value={trackingInfo.carrier} />
        <InfoPill label="Est. Delivery" value={trackingInfo.estimatedDelivery} />
        <InfoPill label="Origin" value={trackingInfo.origin} />
        <InfoPill label="Destination" value={trackingInfo.destination} />
        {trackingInfo.productName && <InfoPill label="Product" value={trackingInfo.productName} />}
        {trackingInfo.weight && <InfoPill label="Weight" value={trackingInfo.weight} />}
      </div>
      
      <h3 className="text-xl font-semibold text-sky-300 mb-4 mt-8">Tracking History</h3>
      {trackingInfo.events.length > 0 ? (
        <ol className="relative">
          {trackingInfo.events.map((event, index) => (
            <EventCard key={index} event={event} isLast={index === trackingInfo.events.length - 1} />
          ))}
        </ol>
      ) : (
        <p className="text-slate-400">No tracking events available.</p>
      )}
      {/* The <style jsx> block that was here has been removed. */}
    </div>
  );
};

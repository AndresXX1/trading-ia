import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchSignals, 
  subscribeToSignals,
  selectCurrentSignals,
  selectLoading,
  selectError,
  selectCurrentPair,
  selectCurrentTimeframe,
  setPair,
  setTimeframe
} from './signalsSlice';

const SignalsList = () => {
  const dispatch = useDispatch();
  const signals = useSelector(selectCurrentSignals);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const currentPair = useSelector(selectCurrentPair);
  const currentTimeframe = useSelector(selectCurrentTimeframe);

  const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'XAUUSD'];
  const timeframes = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];

  useEffect(() => {
    dispatch(fetchSignals({ pair: currentPair, timeframe: currentTimeframe }));
    const subscription = dispatch(subscribeToSignals({ pair: currentPair, timeframe: currentTimeframe }));

    return () => {
      if (subscription) {
        // eslint-disable-next-line no-undef
        api.unsubscribeFromSignals(subscription.payload);
      }
    };
  }, [currentPair, currentTimeframe, dispatch]);

  const handlePairChange = (e) => {
    dispatch(setPair(e.target.value));
  };

  const handleTimeframeChange = (e) => {
    dispatch(setTimeframe(e.target.value));
  };

  if (loading) return <div className="p-4 text-center">Loading signals...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex flex-wrap gap-4 mb-4">
        <select 
          value={currentPair}
          onChange={handlePairChange}
          className="bg-slate-700 text-white p-2 rounded"
        >
          {pairs.map(pair => (
            <option key={pair} value={pair}>{pair}</option>
          ))}
        </select>

        <select 
          value={currentTimeframe}
          onChange={handleTimeframeChange}
          className="bg-slate-700 text-white p-2 rounded"
        >
          {timeframes.map(tf => (
            <option key={tf} value={tf}>{tf}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {signals.map((signal, index) => (
          <SignalCard key={index} signal={signal} />
        ))}
      </div>
    </div>
  );
};

const SignalCard = ({ signal }) => {
  const getSignalColor = () => {
    switch(signal.signal_type) {
      case 'BUY': return 'bg-green-600';
      case 'SELL': return 'bg-red-600';
      case 'HOLD': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className={`p-3 rounded-lg ${getSignalColor()}`}>
      <div className="flex justify-between items-center">
        <span className="font-bold">{signal.symbol} - {signal.timeframe}</span>
        <span className="text-sm">{new Date(signal.timestamp).toLocaleString()}</span>
      </div>
      <div className="mt-2">
        <p>Type: <span className="font-bold">{signal.signal_type}</span></p>
        <p>Entry: {signal.entry_price}</p>
        {signal.stop_loss && <p>SL: {signal.stop_loss}</p>}
        {signal.take_profit && <p>TP: {signal.take_profit}</p>}
        <p>Confidence: {signal.confluence_score.toFixed(2)}</p>
      </div>
      <div className="mt-2 text-xs">
        <p>Analysis: {signal.technical_analyses[0]?.description || 'No analysis available'}</p>
      </div>
    </div>
  );
};

export default SignalsList;
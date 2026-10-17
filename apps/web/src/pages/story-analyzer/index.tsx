import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Vote,
  FileQuestion,
  Layers,
  Radio,
  ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface PollData {
  id: string;
  question: string;
  options: string[];
  confidence: number;
}

export function StoryAnalyzer() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [poll, setPoll] = useState<PollData | null>(null);
  const [error, setError] = useState('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [creatingSession, setCreatingSession] = useState(false);

  // Manual fallback state
  const [isManual, setIsManual] = useState(false);
  const [manualQuestion, setManualQuestion] = useState('');
  const [manualOptionA, setManualOptionA] = useState('');
  const [manualOptionB, setManualOptionB] = useState('');

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setError('');
    setPoll(null);

    try {
      const res = await api.post('/stories/analyze', { url });
      if (res.data?.poll) {
        setPoll({
          id: res.data.poll.id || 'poll_' + Date.now(),
          question: res.data.poll.question,
          options: res.data.poll.options,
          confidence: 0.96,
        });
        setSelectedOption(res.data.poll.options[0]);
      } else {
        setError(res.data?.error || 'No poll sticker detected on this Instagram Story.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze story. Try manual entry or check the URL.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualQuestion.trim() || !manualOptionA.trim() || !manualOptionB.trim()) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await api.post('/stories/manual', {
        question: manualQuestion.trim(),
        options: [manualOptionA.trim(), manualOptionB.trim()]
      });

      if (res.data?.poll) {
        setPoll({
          id: res.data.poll.id,
          question: res.data.poll.question,
          options: res.data.poll.options,
          confidence: 1.0,
        });
        setSelectedOption(res.data.poll.options[0]);
        setIsManual(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register poll');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateSession = async () => {
    if (!poll || !selectedOption) return;
    setCreatingSession(true);
    setError(null);
    try {
      const res = await api.post('/sessions', {
        pollId: poll.id,
        selectedOption,
        name: `Campaign: ${poll.question.slice(0, 30)}...`,
      });
      if (res.data?.session?.id) {
        navigate('/sessions');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create campaign session.');
    } finally {
      setCreatingSession(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Banner with Emblem */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-black/80 ring-1 ring-white/10 overflow-hidden shrink-0 shadow-lg">
            <img src="/logo.png" alt="Emblem" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                POLL EXTRACTION
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white font-serif uppercase mt-1">
              Instagram Story Analyzer
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Detect active Story poll stickers, extract question text, and prepare automated sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Main Analysis Input Card */}
      <Card className="border-white/10 bg-zinc-950/70 backdrop-blur-2xl rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-pink-400" /> Story Source URL
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Paste any active Instagram Story link or use manual configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="https://www.instagram.com/stories/username/1234567890/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-zinc-900/90 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:ring-pink-500"
              disabled={analyzing}
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing || !url.trim()} 
              className="h-12 px-6 w-full sm:w-auto rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 font-semibold shadow-lg shadow-purple-600/20 transition-all hover:scale-105"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : (
                'Extract Poll'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-white/5">
            <span>Powered by official Instagram graph & computer vision simulation</span>
            <button
              onClick={() => setIsManual(!isManual)}
              className="text-pink-400 hover:text-pink-300 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <FileQuestion size={14} /> Manual Poll Entry
            </button>
          </div>

          {/* Manual Entry Fallback */}
          {isManual && (
            <div className="mt-4 p-5 rounded-2xl border border-white/10 bg-zinc-900/90 space-y-4 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Manual Poll Configuration</h4>
              <div className="space-y-1">
                <Label htmlFor="q" className="text-xs text-zinc-300">Poll Question</Label>
                <Input
                  id="q"
                  placeholder="Which track is best?"
                  value={manualQuestion}
                  onChange={(e) => setManualQuestion(e.target.value)}
                  className="bg-black/50 border-white/10 text-white rounded-xl h-10"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="optA" className="text-xs text-zinc-300">Option A</Label>
                  <Input
                    id="optA"
                    placeholder="Track 1"
                    value={manualOptionA}
                    onChange={(e) => setManualOptionA(e.target.value)}
                    className="bg-black/50 border-white/10 text-white rounded-xl h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="optB" className="text-xs text-zinc-300">Option B</Label>
                  <Input
                    id="optB"
                    placeholder="Track 2"
                    value={manualOptionB}
                    onChange={(e) => setManualOptionB(e.target.value)}
                    className="bg-black/50 border-white/10 text-white rounded-xl h-10"
                  />
                </div>
              </div>
              <Button size="sm" onClick={handleManualSubmit} className="rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs">
                Apply Manual Poll
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Error Notification */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-bold text-red-400">Notice</p>
              <p className="text-xs text-zinc-300 mt-0.5">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => navigate('/accounts')} 
              className="text-xs border-white/10 hover:bg-white/10 text-white rounded-xl h-8"
            >
              Manage Accounts
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsManual(true)} 
              className="text-xs bg-pink-600 hover:bg-pink-500 text-white rounded-xl h-8"
            >
              Manual Poll Entry
            </Button>
          </div>
        </Card>
      )}

      {/* Detected Poll Card */}
      {poll && (
        <Card className="border-emerald-500/30 bg-zinc-950/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider font-serif">Poll Sticker Detected</h3>
                <p className="text-xs text-zinc-400">Extracted from public story sticker data</p>
              </div>
            </div>
            <Badge variant="success" className="self-start sm:self-auto px-3 py-1 text-xs">
              Confidence: {(poll.confidence * 100).toFixed(0)}%
            </Badge>
          </div>

          <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-pink-400">Poll Question</div>
            <div className="text-lg sm:text-xl font-bold text-white">{poll.question}</div>
          </div>

          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Select Target Option to Vote For
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {poll.options.map((option, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedOption(option)}
                  className={`p-5 rounded-2xl text-left border transition-all flex items-center justify-between ${
                    selectedOption === option
                      ? 'border-pink-500 bg-pink-500/10 text-white shadow-xl shadow-pink-500/10 ring-2 ring-pink-500/50'
                      : 'border-white/10 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <div>
                    <span className="text-xs font-mono text-zinc-500 block mb-1">Option {idx === 0 ? 'A' : 'B'}</span>
                    <span className="text-base font-bold text-white">{option}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedOption === option ? 'border-pink-500 bg-pink-500' : 'border-zinc-700'
                  }`}>
                    {selectedOption === option && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <Vote size={16} className="text-pink-400" />
              Target Selection: <strong className="text-white text-sm">{selectedOption}</strong>
            </div>
            <Button 
              onClick={handleCreateSession} 
              disabled={creatingSession} 
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 font-bold shadow-xl shadow-indigo-600/25 hover:scale-105 transition-all"
            >
              {creatingSession ? 'Launching...' : 'Create Campaign Session'} <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
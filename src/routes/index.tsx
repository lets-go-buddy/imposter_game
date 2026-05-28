import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, EyeOff, Users, Timer, Sparkles, RotateCcw, Vote, ShieldAlert, Minus, Plus } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Imposter — Pass & Play Party Game" },
      { name: "description", content: "A local pass-and-play imposter party game. Find who got the secret word!" },
      { property: "og:title", content: "Imposter — Pass & Play Party Game" },
      { property: "og:description", content: "A local pass-and-play imposter party game." },
    ],
  }),
  component: Game,
});

type Phase = "setup" | "reveal" | "discussion" | "voting" | "result";
type Role = "citizen" | "imposter";

const WORD_COUNT = 10;
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeRoles(count: number): Role[] {
  return shuffle<Role>([...Array(count - 1).fill("citizen"), "imposter"]);
}

function Game() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [playerCount, setPlayerCount] = useState(4);
  const [words, setWords] = useState<string[]>(Array(WORD_COUNT).fill(""));
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [seen, setSeen] = useState<boolean[]>(Array(4).fill(false));
  const [activePlayer, setActivePlayer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [votedIdx, setVotedIdx] = useState<number | null>(null);

  const startGame = () => {
    const cleaned = words.map((w) => w.trim()).filter(Boolean);
    if (cleaned.length < WORD_COUNT) return;
    const pool = shuffle(cleaned);
    const chosen = pool[0];
    setWordPool(pool);
    setUsedWords([chosen]);
    setCurrentWord(chosen);
    setRoles(makeRoles(playerCount));
    setSeen(Array(playerCount).fill(false));
    setPhase("reveal");
  };

  const nextRound = () => {
    const remaining = wordPool.filter((w) => !usedWords.includes(w));
    const pickFrom = remaining.length > 0 ? remaining : wordPool;
    const chosen = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    setUsedWords((u) => (remaining.length > 0 ? [...u, chosen] : [chosen]));
    setCurrentWord(chosen);
    setRoles(makeRoles(playerCount));
    setSeen(Array(playerCount).fill(false));
    setActivePlayer(null);
    setRevealed(false);
    setTimeLeft(120);
    setVotedIdx(null);
    setPhase("reveal");
  };

  const fullReset = () => {
    setPhase("setup");
    setWords(Array(WORD_COUNT).fill(""));
    setWordPool([]);
    setUsedWords([]);
    setCurrentWord("");
    setRoles([]);
    setSeen(Array(playerCount).fill(false));
    setActivePlayer(null);
    setRevealed(false);
    setTimeLeft(120);
    setVotedIdx(null);
  };

  useEffect(() => {
    if (phase !== "discussion" || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (!revealed || activePlayer === null) return;
    const t = setTimeout(() => closeReveal(), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, activePlayer]);

  const closeReveal = () => {
    if (activePlayer !== null) {
      setSeen((s) => s.map((v, i) => (i === activePlayer ? true : v)));
    }
    setActivePlayer(null);
    setRevealed(false);
  };

  const allSeen = seen.every(Boolean);

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12 flex flex-col items-center">
      <header className="mb-8 sm:mb-12 text-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-primary bg-clip-text text-transparent">
          IMPOSTER
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Pass-and-play · {playerCount} players · Find the spy
        </p>
      </header>

      <div className="w-full max-w-2xl">
        {phase === "setup" && (
          <SetupScreen
            words={words}
            setWords={setWords}
            playerCount={playerCount}
            setPlayerCount={setPlayerCount}
            onStart={startGame}
          />
        )}

        {phase === "reveal" && (
          <RevealScreen
            seen={seen}
            onPick={(i) => {
              setActivePlayer(i);
              setRevealed(false);
            }}
            allSeen={allSeen}
            onProceed={() => setPhase("discussion")}
          />
        )}

        {phase === "discussion" && (
          <DiscussionScreen
            timeLeft={timeLeft}
            onVote={() => setPhase("voting")}
            onAddTime={() => setTimeLeft((t) => t + 30)}
          />
        )}

        {phase === "voting" && <VotingScreen playerCount={playerCount} onVote={(i) => { setVotedIdx(i); setPhase("result"); }} />}

        {phase === "result" && votedIdx !== null && (
          <ResultScreen
            votedIdx={votedIdx}
            role={roles[votedIdx]}
            word={currentWord}
            roundsPlayed={usedWords.length}
            totalWords={wordPool.length}
            onNextRound={nextRound}
            onFullReset={fullReset}
          />
        )}
      </div>

      <Dialog
        open={activePlayer !== null}
        onOpenChange={(o) => { if (!o) closeReveal(); }}
      >
        <DialogContent className="sm:max-w-md border-primary/30 bg-card">
          {activePlayer !== null && (
            <RevealModal
              playerNum={activePlayer + 1}
              role={roles[activePlayer]}
              word={currentWord}
              revealed={revealed}
              onReveal={() => setRevealed(true)}
              onClose={closeReveal}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function SetupScreen(props: {
  words: string[];
  setWords: (w: string[]) => void;
  playerCount: number;
  setPlayerCount: (n: number) => void;
  onStart: () => void;
}) {
  const filled = props.words.filter((w) => w.trim()).length;
  const ready = filled === WORD_COUNT;
  return (
    <Card className="p-6 sm:p-8 bg-card/80 backdrop-blur border-primary/20 animate-pop">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl sm:text-2xl font-semibold">Add 10 secret words</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        One word per round is picked at random — even you won't know which one!
        The imposter gets <span className="text-accent font-semibold">no word at all</span>.
      </p>

      <div className="flex items-center justify-between mb-6 p-4 rounded-xl border border-primary/20 bg-muted/30">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold">Number of players</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => props.setPlayerCount(Math.max(MIN_PLAYERS, props.playerCount - 1))}
            disabled={props.playerCount <= MIN_PLAYERS}
            className="h-8 w-8 rounded-full border border-primary/40 flex items-center justify-center hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-2xl font-black text-primary w-6 text-center">{props.playerCount}</span>
          <button
            onClick={() => props.setPlayerCount(Math.min(MAX_PLAYERS, props.playerCount + 1))}
            disabled={props.playerCount >= MAX_PLAYERS}
            className="h-8 w-8 rounded-full border border-primary/40 flex items-center justify-center hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        {props.words.map((w, i) => (
          <div key={i} className="space-y-1.5">
            <Label htmlFor={`w${i}`} className="text-xs text-muted-foreground">
              Word {i + 1}
            </Label>
            <Input
              id={`w${i}`}
              placeholder={`e.g. ${["Apple","Beach","Cat","Drum","Eiffel Tower","Forest","Guitar","Hat","Ice","Jungle"][i]}`}
              value={w}
              onChange={(e) => {
                const next = [...props.words];
                next[i] = e.target.value;
                props.setWords(next);
              }}
              className="bg-input/50 border-primary/30 focus-visible:ring-primary"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-muted-foreground">{filled} / {WORD_COUNT} words</span>
        <div className="h-1.5 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all"
            style={{ width: `${(filled / WORD_COUNT) * 100}%` }}
          />
        </div>
      </div>

      <Button
        onClick={props.onStart}
        disabled={!ready}
        className="w-full h-14 text-lg font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity glow-cyan disabled:opacity-40 disabled:shadow-none"
      >
        Start Game
      </Button>
    </Card>
  );
}

function RevealScreen(props: {
  seen: boolean[];
  onPick: (i: number) => void;
  allSeen: boolean;
  onProceed: () => void;
}) {
  return (
    <div className="space-y-6 animate-pop">
      <div className="text-center">
        <h2 className="text-2xl font-semibold flex items-center justify-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Pass the device
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Each player taps their card privately.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {props.seen.map((_, i) => (
          <button
            key={i}
            onClick={() => !props.seen[i] && props.onPick(i)}
            disabled={props.seen[i]}
            className={`group relative min-h-[110px] rounded-2xl border-2 p-4 flex flex-col items-center justify-center transition-all ${
              props.seen[i]
                ? "border-primary/30 bg-muted/40 cursor-not-allowed"
                : "border-primary/40 bg-card active:scale-[0.97] sm:hover:border-primary sm:hover:glow-cyan"
            }`}
          >
            {props.seen[i] ? (
              <EyeOff className="h-8 w-8 text-muted-foreground mb-2" />
            ) : (
              <Eye className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-lg sm:text-xl font-bold">Player {i + 1}</span>
            <span className="text-xs mt-1 text-muted-foreground">
              {props.seen[i] ? "Seen ✓" : "Tap to reveal"}
            </span>
          </button>
        ))}
      </div>
      {props.allSeen && (
        <Button
          onClick={props.onProceed}
          className="w-full h-14 text-lg font-bold bg-gradient-primary text-primary-foreground glow-pink animate-pop"
        >
          Proceed to Discussion →
        </Button>
      )}
    </div>
  );
}

function RevealModal(props: {
  playerNum: number;
  role: Role;
  word: string;
  revealed: boolean;
  onReveal: () => void;
  onClose: () => void;
}) {
  const isImposter = props.role === "imposter";
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl text-center">
          Player {props.playerNum}
        </DialogTitle>
        <DialogDescription className="text-center">
          {props.revealed
            ? "Memorise this and hide the screen."
            : `Are you Player ${props.playerNum}? Tap to reveal.`}
        </DialogDescription>
      </DialogHeader>
      <div className="py-6 flex flex-col items-center gap-4">
        {!props.revealed ? (
          <button
            onClick={props.onReveal}
            className="w-full h-32 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xl glow-cyan hover:scale-[1.02] transition-transform"
          >
            👁  Tap to Reveal
          </button>
        ) : (
          <div className="w-full animate-flip-in">
            {isImposter ? (
              <div className="w-full min-h-32 rounded-xl border-2 border-accent bg-card flex flex-col items-center justify-center p-6 glow-pink gap-2">
                <ShieldAlert className="h-10 w-10 text-accent" />
                <span className="text-2xl sm:text-4xl font-black text-accent text-glow-pink text-center">
                  You are the Imposter
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  You don't get a word. Bluff your way through!
                </span>
              </div>
            ) : (
              <div className="w-full min-h-32 rounded-xl border-2 border-primary bg-card flex flex-col items-center justify-center p-6 glow-cyan gap-2">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Your secret word
                </span>
                <span className="text-3xl sm:text-4xl font-black text-primary text-glow-cyan break-all text-center">
                  {props.word}
                </span>
              </div>
            )}
            <Button
              onClick={props.onClose}
              className="w-full mt-4 bg-secondary hover:bg-secondary/80"
            >
              Close (auto in 3s)
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function DiscussionScreen(props: {
  timeLeft: number;
  onVote: () => void;
  onAddTime: () => void;
}) {
  const mins = Math.floor(props.timeLeft / 60);
  const secs = props.timeLeft % 60;
  const pct = Math.min(100, (props.timeLeft / 120) * 100);
  const urgent = props.timeLeft <= 15;
  return (
    <Card className="p-6 sm:p-10 bg-card/80 backdrop-blur border-primary/20 animate-pop text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Timer className={`h-6 w-6 ${urgent ? "text-destructive" : "text-primary"}`} />
        <h2 className="text-xl font-semibold">Discussion Round</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Describe your word without saying it. Find the imposter!
      </p>
      <div
        className={`text-6xl sm:text-8xl font-black tabular-nums my-6 ${
          urgent ? "text-destructive animate-pulse" : "text-primary text-glow-cyan"
        }`}
      >
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-8">
        <div
          className={`h-full transition-all duration-1000 ${urgent ? "bg-destructive" : "bg-gradient-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={props.onAddTime} className="flex-1 border-primary/40">
          +30 seconds
        </Button>
        <Button onClick={props.onVote} className="flex-1 h-12 bg-gradient-primary text-primary-foreground font-bold glow-pink">
          <Vote className="h-5 w-5 mr-2" /> Go to Vote
        </Button>
      </div>
    </Card>
  );
}

function VotingScreen(props: { playerCount: number; onVote: (i: number) => void }) {
  return (
    <div className="space-y-6 animate-pop">
      <div className="text-center">
        <h2 className="text-2xl font-semibold flex items-center justify-center gap-2">
          <Vote className="h-6 w-6 text-accent" /> Cast Your Vote
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Who is the imposter?</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: props.playerCount }, (_, i) => (
          <Card key={i} className="p-5 bg-card border-accent/20 flex items-center justify-between hover:border-accent/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center font-black text-primary-foreground">
                {i + 1}
              </div>
              <span className="font-semibold text-lg">Player {i + 1}</span>
            </div>
            <Button onClick={() => props.onVote(i)} variant="destructive" className="font-bold">
              Vote Out
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ResultScreen(props: {
  votedIdx: number;
  role: Role;
  word: string;
  roundsPlayed: number;
  totalWords: number;
  onNextRound: () => void;
  onFullReset: () => void;
}) {
  const wasImposter = props.role === "imposter";
  const winner = wasImposter ? "Citizens Win!" : "Imposter Wins!";
  return (
    <Card
      className={`p-8 sm:p-12 bg-card/80 backdrop-blur text-center animate-pop ${
        wasImposter ? "border-primary glow-cyan" : "border-accent glow-pink"
      }`}
    >
      <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">The verdict</p>
      <h2 className="text-3xl sm:text-4xl font-black mb-4">
        Player {props.votedIdx + 1} was{" "}
        <span className={wasImposter ? "text-accent text-glow-pink" : "text-primary text-glow-cyan"}>
          {wasImposter ? "The Imposter" : "A Citizen"}!
        </span>
      </h2>
      <div className={`text-5xl sm:text-6xl font-black my-6 ${wasImposter ? "text-primary text-glow-cyan" : "text-accent text-glow-pink"}`}>
        {winner}
      </div>
      <p className="text-muted-foreground mb-2">
        The secret word was <span className="font-bold text-foreground">{props.word}</span>
      </p>
      <p className="text-xs text-muted-foreground mb-8">
        Round {props.roundsPlayed} of {props.totalWords}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={props.onNextRound} className="h-14 px-8 text-lg font-bold bg-gradient-primary text-primary-foreground glow-cyan">
          <Sparkles className="h-5 w-5 mr-2" /> Next Round
        </Button>
        <Button onClick={props.onFullReset} variant="outline" className="h-14 px-8 text-lg font-bold border-primary/40">
          <RotateCcw className="h-5 w-5 mr-2" /> New Words
        </Button>
      </div>
    </Card>
  );
}

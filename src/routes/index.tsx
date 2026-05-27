import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, EyeOff, Users, Timer, Sparkles, RotateCcw, Vote } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Imposter — Pass & Play Party Game" },
      { name: "description", content: "A 4-player local pass-and-play imposter party game. Find who got the secret word!" },
      { property: "og:title", content: "Imposter — Pass & Play Party Game" },
      { property: "og:description", content: "A 4-player local pass-and-play imposter party game." },
    ],
  }),
  component: Game,
});

type Phase = "setup" | "reveal" | "discussion" | "voting" | "result";
type Role = "citizen" | "imposter";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Game() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [citizenWord, setCitizenWord] = useState("");
  const [imposterWord, setImposterWord] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [seen, setSeen] = useState<boolean[]>([false, false, false, false]);
  const [activePlayer, setActivePlayer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [votedIdx, setVotedIdx] = useState<number | null>(null);

  const startGame = () => {
    if (!citizenWord.trim() || !imposterWord.trim()) return;
    const r: Role[] = ["citizen", "citizen", "citizen", "imposter"];
    setRoles(shuffle(r));
    setSeen([false, false, false, false]);
    setPhase("reveal");
  };

  const reset = () => {
    setPhase("setup");
    setCitizenWord("");
    setImposterWord("");
    setRoles([]);
    setSeen([false, false, false, false]);
    setActivePlayer(null);
    setRevealed(false);
    setTimeLeft(120);
    setVotedIdx(null);
  };

  // Timer
  useEffect(() => {
    if (phase !== "discussion") return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // Auto-close reveal after 3s
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

  const vote = (idx: number) => {
    setVotedIdx(idx);
    setPhase("result");
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12 flex flex-col items-center">
      <header className="mb-8 sm:mb-12 text-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-primary bg-clip-text text-transparent">
          IMPOSTER
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Pass-and-play · 4 players · Find the spy
        </p>
      </header>

      <div className="w-full max-w-2xl">
        {phase === "setup" && (
          <SetupScreen
            citizenWord={citizenWord}
            imposterWord={imposterWord}
            setCitizenWord={setCitizenWord}
            setImposterWord={setImposterWord}
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

        {phase === "voting" && <VotingScreen onVote={vote} />}

        {phase === "result" && votedIdx !== null && (
          <ResultScreen
            votedIdx={votedIdx}
            role={roles[votedIdx]}
            onPlayAgain={reset}
          />
        )}
      </div>

      <Dialog
        open={activePlayer !== null}
        onOpenChange={(o) => {
          if (!o) closeReveal();
        }}
      >
        <DialogContent className="sm:max-w-md border-primary/30 bg-card">
          {activePlayer !== null && (
            <RevealModal
              playerNum={activePlayer + 1}
              word={roles[activePlayer] === "imposter" ? imposterWord : citizenWord}
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
  citizenWord: string;
  imposterWord: string;
  setCitizenWord: (s: string) => void;
  setImposterWord: (s: string) => void;
  onStart: () => void;
}) {
  const ready = props.citizenWord.trim() && props.imposterWord.trim();
  return (
    <Card className="p-6 sm:p-8 bg-card/80 backdrop-blur border-primary/20 animate-pop">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl sm:text-2xl font-semibold">Game Setup</h2>
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="citizen" className="text-primary text-glow-cyan">
            Word for Citizens (3 players)
          </Label>
          <Input
            id="citizen"
            placeholder="e.g. Apple"
            value={props.citizenWord}
            onChange={(e) => props.setCitizenWord(e.target.value)}
            className="bg-input/50 border-primary/30 focus-visible:ring-primary text-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="imposter" className="text-accent text-glow-pink">
            Word for the Imposter (1 player)
          </Label>
          <Input
            id="imposter"
            placeholder="e.g. Pear"
            value={props.imposterWord}
            onChange={(e) => props.setImposterWord(e.target.value)}
            className="bg-input/50 border-accent/40 focus-visible:ring-accent text-lg"
          />
        </div>
        <Button
          onClick={props.onStart}
          disabled={!ready}
          className="w-full h-14 text-lg font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity glow-cyan disabled:opacity-40 disabled:shadow-none"
        >
          Start Game
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Roles are assigned randomly. Keep your word secret!
        </p>
      </div>
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
          Each player taps their card privately to see their word.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => !props.seen[i] && props.onPick(i)}
            disabled={props.seen[i]}
            className={`group relative aspect-square rounded-2xl border-2 p-4 flex flex-col items-center justify-center transition-all ${
              props.seen[i]
                ? "border-primary/30 bg-muted/40 cursor-not-allowed"
                : "border-primary/40 bg-card hover:border-primary hover:-translate-y-1 hover:glow-cyan"
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
  word: string;
  revealed: boolean;
  onReveal: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl text-center">
          Player {props.playerNum}
        </DialogTitle>
        <DialogDescription className="text-center">
          {props.revealed
            ? "This is your secret word. Hide the screen when done."
            : `Are you Player ${props.playerNum}? Tap to reveal your secret word.`}
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
            <div className="w-full min-h-32 rounded-xl border-2 border-primary bg-card flex items-center justify-center p-6 glow-cyan">
              <span className="text-3xl sm:text-4xl font-black text-primary text-glow-cyan break-all text-center">
                {props.word}
              </span>
            </div>
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
  const pct = (props.timeLeft / 120) * 100;
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
        className={`text-7xl sm:text-8xl font-black tabular-nums my-6 ${
          urgent ? "text-destructive animate-pulse" : "text-primary text-glow-cyan"
        }`}
      >
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-8">
        <div
          className={`h-full transition-all duration-1000 ${
            urgent ? "bg-destructive" : "bg-gradient-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={props.onAddTime}
          className="flex-1 border-primary/40"
        >
          +30 seconds
        </Button>
        <Button
          onClick={props.onVote}
          className="flex-1 h-12 bg-gradient-primary text-primary-foreground font-bold glow-pink"
        >
          <Vote className="h-5 w-5 mr-2" /> Go to Vote
        </Button>
      </div>
    </Card>
  );
}

function VotingScreen(props: { onVote: (i: number) => void }) {
  return (
    <div className="space-y-6 animate-pop">
      <div className="text-center">
        <h2 className="text-2xl font-semibold flex items-center justify-center gap-2">
          <Vote className="h-6 w-6 text-accent" /> Cast Your Vote
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Who is the imposter? Vote them out.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card
            key={i}
            className="p-5 bg-card border-accent/20 flex items-center justify-between hover:border-accent/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center font-black text-primary-foreground">
                {i + 1}
              </div>
              <span className="font-semibold text-lg">Player {i + 1}</span>
            </div>
            <Button
              onClick={() => props.onVote(i)}
              variant="destructive"
              className="font-bold"
            >
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
  onPlayAgain: () => void;
}) {
  const wasImposter = props.role === "imposter";
  const winner = wasImposter ? "Citizens Win!" : "Imposter Wins!";
  return (
    <Card
      className={`p-8 sm:p-12 bg-card/80 backdrop-blur text-center animate-pop ${
        wasImposter ? "border-primary glow-cyan" : "border-accent glow-pink"
      }`}
    >
      <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">
        The verdict
      </p>
      <h2 className="text-3xl sm:text-4xl font-black mb-4">
        Player {props.votedIdx + 1} was{" "}
        <span className={wasImposter ? "text-accent text-glow-pink" : "text-primary text-glow-cyan"}>
          {wasImposter ? "The Imposter" : "A Citizen"}!
        </span>
      </h2>
      <div
        className={`text-5xl sm:text-6xl font-black my-8 ${
          wasImposter ? "text-primary text-glow-cyan" : "text-accent text-glow-pink"
        }`}
      >
        {winner}
      </div>
      <Button
        onClick={props.onPlayAgain}
        className="h-14 px-8 text-lg font-bold bg-gradient-primary text-primary-foreground glow-cyan"
      >
        <RotateCcw className="h-5 w-5 mr-2" /> Play Again
      </Button>
    </Card>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, EyeOff, Users, Sparkles, RotateCcw, Vote, ShieldAlert, Minus, Plus } from "lucide-react";

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

type Phase = "setup" | "reveal" | "voting" | "result";
type Role = "citizen" | "imposter";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;

const WORDS = [
  "Prime NL rap",
  "Prime quarantaine muziek",
  "Meme muziek",
  "White girl music",
  "Festival muziek",
  "Gym bro muziek",
  "Sad boy muziek",
  "TikTok dansen muziek",
  "Autorijden muziek",
  "Afro party muziek",
  "Bruiloft muziek",
  "Supermarkt achtergrondmuziek",
  "Mama's favoriete muziek",
  "Huisfeest muziek",
  "Straat muziek",
  "Voetbalstadion muziek",
  "Vakantie muziek",
  "Gaming muziek",
  "Hardstyle",
  "Kroeg muziek",
  "Nachtclub muziek",
  "Trap muziek",
  "Telenovela muziek",
  "Douchezingen muziek",
  "School disco muziek",
];

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
  const [playerNames, setPlayerNames] = useState<string[]>(["", "", "", ""]);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [seen, setSeen] = useState<boolean[]>(Array(4).fill(false));
  const [activePlayer, setActivePlayer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [votedIdx, setVotedIdx] = useState<number | null>(null);

  const updatePlayerCount = (n: number) => {
    setPlayerCount(n);
    setPlayerNames((prev) => {
      const next = [...prev];
      while (next.length < n) next.push("");
      return next.slice(0, n);
    });
  };

  const getName = (i: number) => playerNames[i]?.trim() || `Speler ${i + 1}`;

  const startGame = () => {
    const pool = shuffle([...WORDS]);
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
    setVotedIdx(null);
    setPhase("reveal");
  };

  const fullReset = () => {
    setPhase("setup");
    setWordPool([]);
    setUsedWords([]);
    setCurrentWord("");
    setRoles([]);
    setSeen(Array(playerCount).fill(false));
    setActivePlayer(null);
    setRevealed(false);
    setVotedIdx(null);
  };

  useEffect(() => {
    if (!revealed || activePlayer === null) return;
    // no auto-close
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
    <main className="min-h-screen px-4 py-8 sm:py-12 flex flex-col items-center bg-black/50 backdrop-blur-[2px]">
      <header className="mb-8 sm:mb-12 text-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-primary bg-clip-text text-transparent">
          IMPOSTER
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Pass-and-play · {playerCount} spelers · Vind de spy
        </p>
      </header>

      <div className="w-full max-w-2xl">
        {phase === "setup" && (
          <SetupScreen
            playerCount={playerCount}
            setPlayerCount={updatePlayerCount}
            playerNames={playerNames}
            setPlayerNames={setPlayerNames}
            onStart={startGame}
          />
        )}

        {phase === "reveal" && (
          <RevealScreen
            seen={seen}
            names={playerNames.slice(0, playerCount).map((_, i) => getName(i))}
            onPick={(i) => {
              setActivePlayer(i);
              setRevealed(false);
            }}
            allSeen={allSeen}
            onProceed={() => setPhase("voting")}
          />
        )}

        {phase === "voting" && (
          <VotingScreen
            names={playerNames.slice(0, playerCount).map((_, i) => getName(i))}
            onVote={(i) => { setVotedIdx(i); setPhase("result"); }}
          />
        )}

        {phase === "result" && votedIdx !== null && (
          <ResultScreen
            votedName={getName(votedIdx)}
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
              playerName={getName(activePlayer)}
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
  playerCount: number;
  setPlayerCount: (n: number) => void;
  playerNames: string[];
  setPlayerNames: (names: string[]) => void;
  onStart: () => void;
}) {
  return (
    <Card className="p-6 sm:p-8 bg-card/80 backdrop-blur border-primary/20 animate-pop space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl sm:text-2xl font-semibold">Imposter</h2>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Aantal spelers</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => props.setPlayerCount(Math.max(MIN_PLAYERS, props.playerCount - 1))}
            disabled={props.playerCount <= MIN_PLAYERS}
            className="h-10 w-10 rounded-full border-2 border-primary/40 flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-transform"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className="text-4xl font-black text-primary w-8 text-center">{props.playerCount}</span>
          <button
            onClick={() => props.setPlayerCount(Math.min(MAX_PLAYERS, props.playerCount + 1))}
            disabled={props.playerCount >= MAX_PLAYERS}
            className="h-10 w-10 rounded-full border-2 border-primary/40 flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-transform"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {Array.from({ length: props.playerCount }, (_, i) => (
          <Input
            key={i}
            placeholder={`Speler ${i + 1}`}
            value={props.playerNames[i] ?? ""}
            onChange={(e) => {
              const next = [...props.playerNames];
              next[i] = e.target.value;
              props.setPlayerNames(next);
            }}
            className="bg-input/50 border-primary/30 focus-visible:ring-primary"
          />
        ))}
      </div>

      <Button
        onClick={props.onStart}
        className="w-full h-14 text-lg font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity glow-cyan"
      >
        Start Spel
      </Button>
    </Card>
  );
}

function RevealScreen(props: {
  seen: boolean[];
  names: string[];
  onPick: (i: number) => void;
  allSeen: boolean;
  onProceed: () => void;
}) {
  return (
    <div className="space-y-6 animate-pop">
      <div className="text-center">
        <h2 className="text-2xl font-semibold flex items-center justify-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Geef het toestel door
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Elke speler tikt op zijn kaart.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {props.seen.map((done, i) => (
          <button
            key={i}
            onClick={() => !done && props.onPick(i)}
            disabled={done}
            className={`group relative min-h-[110px] rounded-2xl border-2 p-4 flex flex-col items-center justify-center transition-all ${
              done
                ? "border-primary/30 bg-muted/40 cursor-not-allowed"
                : "border-primary/40 bg-card active:scale-[0.97] sm:hover:border-primary sm:hover:glow-cyan"
            }`}
          >
            {done ? (
              <EyeOff className="h-8 w-8 text-muted-foreground mb-2" />
            ) : (
              <Eye className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-base sm:text-lg font-bold text-center break-words w-full">{props.names[i]}</span>
            <span className="text-xs mt-1 text-muted-foreground">
              {done ? "Gezien ✓" : "Tik om te zien"}
            </span>
          </button>
        ))}
      </div>
      {props.allSeen && (
        <Button
          onClick={props.onProceed}
          className="w-full h-14 text-lg font-bold bg-gradient-primary text-primary-foreground glow-pink animate-pop"
        >
          <Vote className="h-5 w-5 mr-2" /> Ga naar stemmen →
        </Button>
      )}
    </div>
  );
}

function RevealModal(props: {
  playerName: string;
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
          {props.playerName}
        </DialogTitle>
        <DialogDescription className="text-center">
          {props.revealed
            ? "Onthoud dit en verberg het scherm."
            : `Ben jij ${props.playerName}? Tik om te onthullen.`}
        </DialogDescription>
      </DialogHeader>
      <div className="py-6 flex flex-col items-center gap-4">
        {!props.revealed ? (
          <button
            onClick={props.onReveal}
            className="w-full h-32 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xl glow-cyan active:scale-[0.98] transition-transform"
          >
            👁  Tik om te onthullen
          </button>
        ) : (
          <div className="w-full animate-flip-in">
            {isImposter ? (
              <div className="w-full min-h-32 rounded-xl border-2 border-accent bg-card flex flex-col items-center justify-center p-6 glow-pink gap-2">
                <ShieldAlert className="h-10 w-10 text-accent" />
                <span className="text-2xl sm:text-4xl font-black text-accent text-glow-pink text-center">
                  Jij bent de Imposter
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  Je krijgt geen woord. Bluf je er doorheen!
                </span>
              </div>
            ) : (
              <div className="w-full min-h-32 rounded-xl border-2 border-primary bg-card flex flex-col items-center justify-center p-6 glow-cyan gap-2">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Jouw geheime woord
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
              Sluiten
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function VotingScreen(props: { names: string[]; onVote: (i: number) => void }) {
  return (
    <div className="space-y-6 animate-pop">
      <div className="text-center">
        <h2 className="text-2xl font-semibold flex items-center justify-center gap-2">
          <Vote className="h-6 w-6 text-accent" /> Stem
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Wie is de imposter?</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {props.names.map((name, i) => (
          <Card key={i} className="p-5 bg-card border-accent/20 flex items-center justify-between hover:border-accent/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center font-black text-primary-foreground shrink-0">
                {i + 1}
              </div>
              <span className="font-semibold text-lg break-words">{name}</span>
            </div>
            <Button onClick={() => props.onVote(i)} variant="destructive" className="font-bold shrink-0 ml-2">
              Vote
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ResultScreen(props: {
  votedName: string;
  role: Role;
  word: string;
  roundsPlayed: number;
  totalWords: number;
  onNextRound: () => void;
  onFullReset: () => void;
}) {
  const wasImposter = props.role === "imposter";
  const winner = wasImposter ? "Burgers winnen!" : "Imposter wint!";
  return (
    <Card
      className={`p-8 sm:p-12 bg-card/80 backdrop-blur text-center animate-pop ${
        wasImposter ? "border-primary glow-cyan" : "border-accent glow-pink"
      }`}
    >
      <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Het verdict</p>
      <h2 className="text-3xl sm:text-4xl font-black mb-4">
        {props.votedName} was{" "}
        <span className={wasImposter ? "text-accent text-glow-pink" : "text-primary text-glow-cyan"}>
          {wasImposter ? "de Imposter" : "een Burger"}!
        </span>
      </h2>
      <div className={`text-5xl sm:text-6xl font-black my-6 ${wasImposter ? "text-primary text-glow-cyan" : "text-accent text-glow-pink"}`}>
        {winner}
      </div>
      <p className="text-muted-foreground mb-1">
        Het geheime woord was <span className="font-bold text-foreground">{props.word}</span>
      </p>
      <p className="text-xs text-muted-foreground mb-8">
        Ronde {props.roundsPlayed} van {props.totalWords}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={props.onNextRound} className="h-14 px-8 text-lg font-bold bg-gradient-primary text-primary-foreground glow-cyan">
          <Sparkles className="h-5 w-5 mr-2" /> Volgende ronde
        </Button>
        <Button onClick={props.onFullReset} variant="outline" className="h-14 px-8 text-lg font-bold border-primary/40">
          <RotateCcw className="h-5 w-5 mr-2" /> Opnieuw
        </Button>
      </div>
    </Card>
  );
}

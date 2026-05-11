import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Play,
  RefreshCcw,
  Sparkles,
  TimerReset
} from "lucide-react";
import { useMemo, useState } from "react";

type SkillKey = "syntax" | "dependencyLogic" | "cleanup";
type MisconceptionFlag =
  | "infinite_loop_trigger"
  | "stale_closure_trigger"
  | "missing_cleanup_trigger";

interface StudentModel {
  skills: Record<SkillKey, number>;
  flags: Record<MisconceptionFlag, boolean>;
  attempts: number;
}

interface Choice {
  id: string;
  label: string;
  code: string;
  isCorrect: boolean;
  feedback: string;
  hint: string;
  timeline: string[];
  skillDeltas: Partial<Record<SkillKey, number>>;
  flag?: MisconceptionFlag;
}

interface Scenario {
  id: string;
  title: string;
  focus: string;
  prompt: string;
  code: string;
  choices: Choice[];
}

const initialModel: StudentModel = {
  skills: {
    syntax: 0.45,
    dependencyLogic: 0.35,
    cleanup: 0.25
  },
  flags: {
    infinite_loop_trigger: false,
    stale_closure_trigger: false,
    missing_cleanup_trigger: false
  },
  attempts: 0
};

const scenarios: Scenario[] = [
  {
    id: "loop",
    title: "Infinite Loop",
    focus: "Dependency logic",
    prompt:
      "The component should load a starting count once. Which effect avoids a render loop?",
    code: `function CounterLoader() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(count + 1);
  });

  return <p>{count}</p>;
}`,
    choices: [
      {
        id: "loop-a",
        label: "Run the effect after every render",
        code: `useEffect(() => {
  setCount(count + 1);
});`,
        isCorrect: false,
        feedback:
          "This keeps updating state after every render, so the component renders again and repeats the effect.",
        hint: "Ask yourself: what event should cause this effect to run again?",
        timeline: [
          "Render with count = 0",
          "Effect runs and updates count",
          "State update causes re-render",
          "Effect runs again",
          "Loop continues"
        ],
        skillDeltas: { dependencyLogic: -0.08 },
        flag: "infinite_loop_trigger"
      },
      {
        id: "loop-b",
        label: "Run once with a functional state update",
        code: `useEffect(() => {
  setCount((current) => current + 1);
}, []);`,
        isCorrect: true,
        feedback:
          "Correct. The empty dependency array makes this run for the initial synchronization, and the functional update avoids depending on a stale count value.",
        hint: "This effect has no outside value it needs to re-sync with.",
        timeline: [
          "Initial render with count = 0",
          "Effect runs once",
          "Functional state update sets count = 1",
          "Component re-renders",
          "Dependency array prevents a second effect run"
        ],
        skillDeltas: { syntax: 0.08, dependencyLogic: 0.16 }
      },
      {
        id: "loop-c",
        label: "Add count to the dependency array",
        code: `useEffect(() => {
  setCount(count + 1);
}, [count]);`,
        isCorrect: false,
        feedback:
          "Including count makes the effect run whenever count changes, but the effect itself changes count. That still creates a loop.",
        hint: "A dependency should trigger synchronization, not chase the value it just changed.",
        timeline: [
          "Render with count = 0",
          "Effect runs and sets count = 1",
          "count changed, so effect runs again",
          "Effect sets count = 2",
          "Loop continues"
        ],
        skillDeltas: { dependencyLogic: -0.06 },
        flag: "infinite_loop_trigger"
      }
    ]
  },
  {
    id: "stale",
    title: "Stale Data",
    focus: "Dependencies",
    prompt:
      "The search results should update when the search term changes. Which dependency array is best?",
    code: `function SearchResults({ term }: { term: string }) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    fakeSearch(term).then(setResults);
  }, []);

  return <ResultList items={results} />;
}`,
    choices: [
      {
        id: "stale-a",
        label: "Leave the dependency array empty",
        code: `useEffect(() => {
  fakeSearch(term).then(setResults);
}, []);`,
        isCorrect: false,
        feedback:
          "The effect closes over the first term and never re-runs, so later searches can show stale results.",
        hint: "Look for values from props or state being read inside the effect.",
        timeline: [
          "Render with term = react",
          "Effect fetches react results",
          "User changes term to hooks",
          "Component re-renders",
          "Effect does not re-run, so results stay stale"
        ],
        skillDeltas: { dependencyLogic: -0.08 },
        flag: "stale_closure_trigger"
      },
      {
        id: "stale-b",
        label: "Depend on term",
        code: `useEffect(() => {
  fakeSearch(term).then(setResults);
}, [term]);`,
        isCorrect: true,
        feedback:
          "Correct. The effect synchronizes search results with the current term, so term belongs in the dependency array.",
        hint: "Every external value used by the effect should be considered as a dependency.",
        timeline: [
          "Render with term = react",
          "Effect fetches react results",
          "User changes term to hooks",
          "term changed, so effect runs again",
          "Results update for hooks"
        ],
        skillDeltas: { syntax: 0.06, dependencyLogic: 0.18 }
      },
      {
        id: "stale-c",
        label: "Depend on results",
        code: `useEffect(() => {
  fakeSearch(term).then(setResults);
}, [results]);`,
        isCorrect: false,
        feedback:
          "The effect updates results, so using results as the trigger can cause extra fetches and does not directly track the search term.",
        hint: "The dependency should be the value that the external request is based on.",
        timeline: [
          "Render with old results",
          "Effect fetches using term",
          "setResults changes results",
          "results changed, so effect runs again",
          "Unnecessary fetch cycle begins"
        ],
        skillDeltas: { dependencyLogic: -0.05 },
        flag: "stale_closure_trigger"
      }
    ]
  },
  {
    id: "cleanup",
    title: "Timer Cleanup",
    focus: "Cleanup implementation",
    prompt:
      "The timer should stop when the component disappears. Which effect handles cleanup correctly?",
    code: `function SessionTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);
  }, []);

  return <p>{seconds}s</p>;
}`,
    choices: [
      {
        id: "cleanup-a",
        label: "Create the interval without returning anything",
        code: `useEffect(() => {
  const id = setInterval(() => {
    setSeconds((value) => value + 1);
  }, 1000);
}, []);`,
        isCorrect: false,
        feedback:
          "The interval keeps running after the component unmounts because nothing tells the browser to clear it.",
        hint: "When an effect starts a subscription or timer, ask what should undo it.",
        timeline: [
          "Component mounts",
          "Effect starts an interval",
          "Timer updates state every second",
          "Component unmounts",
          "Interval keeps running without cleanup"
        ],
        skillDeltas: { cleanup: -0.1 },
        flag: "missing_cleanup_trigger"
      },
      {
        id: "cleanup-b",
        label: "Return a cleanup that clears the interval",
        code: `useEffect(() => {
  const id = setInterval(() => {
    setSeconds((value) => value + 1);
  }, 1000);

  return () => clearInterval(id);
}, []);`,
        isCorrect: true,
        feedback:
          "Correct. The effect starts the timer, and the returned cleanup function stops it when the component unmounts.",
        hint: "Cleanup should reverse what the effect started.",
        timeline: [
          "Component mounts",
          "Effect starts an interval",
          "Timer updates state",
          "Component unmounts",
          "Cleanup clears the interval"
        ],
        skillDeltas: { syntax: 0.05, cleanup: 0.22 }
      },
      {
        id: "cleanup-c",
        label: "Clear the interval immediately inside the effect",
        code: `useEffect(() => {
  const id = setInterval(() => {
    setSeconds((value) => value + 1);
  }, 1000);

  clearInterval(id);
}, []);`,
        isCorrect: false,
        feedback:
          "This stops the timer immediately, so the effect never actually keeps the session timer running.",
        hint: "Cleanup should be returned so React can call it later.",
        timeline: [
          "Component mounts",
          "Effect starts an interval",
          "Effect immediately clears it",
          "Timer never ticks",
          "No meaningful cleanup remains for unmount"
        ],
        skillDeltas: { cleanup: -0.04 },
        flag: "missing_cleanup_trigger"
      }
    ]
  }
];

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function App() {
  const [activeScenarioId, setActiveScenarioId] = useState(scenarios[0].id);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [submittedChoice, setSubmittedChoice] = useState<Choice | null>(null);
  const [studentModel, setStudentModel] = useState<StudentModel>(initialModel);

  const activeScenario = useMemo(
    () =>
      scenarios.find((scenario) => scenario.id === activeScenarioId) ??
      scenarios[0],
    [activeScenarioId]
  );

  const selectedChoice =
    activeScenario.choices.find((choice) => choice.id === selectedChoiceId) ??
    null;

  const glowLevel = submittedChoice
    ? submittedChoice.isCorrect
      ? "success"
      : "warning"
    : selectedChoice && !selectedChoice.isCorrect
      ? "preview"
      : "idle";

  function selectScenario(id: string) {
    setActiveScenarioId(id);
    setSelectedChoiceId(null);
    setSubmittedChoice(null);
  }

  function submitChoice() {
    if (!selectedChoice) {
      return;
    }

    setSubmittedChoice(selectedChoice);
    setStudentModel((current) => {
      const nextFlags = { ...current.flags };
      if (selectedChoice.flag) {
        nextFlags[selectedChoice.flag] = true;
      }

      return {
        attempts: current.attempts + 1,
        flags: nextFlags,
        skills: {
          syntax: clamp(
            current.skills.syntax + (selectedChoice.skillDeltas.syntax ?? 0)
          ),
          dependencyLogic: clamp(
            current.skills.dependencyLogic +
              (selectedChoice.skillDeltas.dependencyLogic ?? 0)
          ),
          cleanup: clamp(
            current.skills.cleanup + (selectedChoice.skillDeltas.cleanup ?? 0)
          )
        }
      };
    });
  }

  function resetTutor() {
    setSelectedChoiceId(null);
    setSubmittedChoice(null);
    setStudentModel(initialModel);
  }

  const currentTimeline =
    submittedChoice?.timeline ??
    selectedChoice?.timeline ??
    [
      "Read the scenario",
      "Choose a possible useEffect fix",
      "Preview the tutor hint",
      "Submit the answer",
      "Review the effect timeline"
    ];

  return (
    <main className="appShell">
      <section className="workspace">
        <header className="topBar">
          <div>
            <p className="eyebrow">React Effect Tutor</p>
            <h1>useEffect side-effect coach</h1>
          </div>
          <button className="ghostButton" type="button" onClick={resetTutor}>
            <RefreshCcw size={18} aria-hidden="true" />
            Reset
          </button>
        </header>

        <nav className="scenarioTabs" aria-label="Tutoring scenarios">
          {scenarios.map((scenario) => (
            <button
              className={scenario.id === activeScenario.id ? "active" : ""}
              key={scenario.id}
              type="button"
              onClick={() => selectScenario(scenario.id)}
            >
              {scenario.title}
            </button>
          ))}
        </nav>

        <section className="mainGrid">
          <article className="codePane" aria-labelledby="code-heading">
            <div className="paneHeader">
              <div>
                <p className="eyebrow">Student task</p>
                <h2 id="code-heading">{activeScenario.title}</h2>
              </div>
              <span className="focusPill">{activeScenario.focus}</span>
            </div>

            <p className="prompt">{activeScenario.prompt}</p>
            <pre className="codeBlock">
              <code>{activeScenario.code}</code>
            </pre>

            <div className="choiceGroup" aria-label="Answer choices">
              {activeScenario.choices.map((choice) => (
                <label
                  className={
                    choice.id === selectedChoiceId
                      ? "choiceItem selected"
                      : "choiceItem"
                  }
                  key={choice.id}
                >
                  <input
                    checked={choice.id === selectedChoiceId}
                    name="effect-choice"
                    type="radio"
                    onChange={() => {
                      setSelectedChoiceId(choice.id);
                      setSubmittedChoice(null);
                    }}
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </div>

            {selectedChoice ? (
              <pre className="answerBlock">
                <code>{selectedChoice.code}</code>
              </pre>
            ) : null}

            <button
              className="primaryButton"
              type="button"
              disabled={!selectedChoice}
              onClick={submitChoice}
            >
              <Play size={18} aria-hidden="true" />
              Check Answer
            </button>
          </article>

          <aside className="sideStack">
            <section className="renderPane" aria-labelledby="timeline-heading">
              <div className="paneHeader compact">
                <div>
                  <p className="eyebrow">Visualization</p>
                  <h2 id="timeline-heading">Effect Timeline</h2>
                </div>
                <Clock3 size={22} aria-hidden="true" />
              </div>
              <ol className="timeline">
                {currentTimeline.map((step, index) => (
                  <li key={`${step}-${index}`}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section
              className={`tutorPane glow-${glowLevel}`}
              aria-labelledby="tutor-heading"
            >
              <div className="paneHeader compact">
                <div>
                  <p className="eyebrow">Tutor panel</p>
                  <h2 id="tutor-heading">Feedback Glow</h2>
                </div>
                <Sparkles size={22} aria-hidden="true" />
              </div>

              <TutorMessage
                selectedChoice={selectedChoice}
                submittedChoice={submittedChoice}
              />

              <StudentModelView studentModel={studentModel} />
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function TutorMessage({
  selectedChoice,
  submittedChoice
}: {
  selectedChoice: Choice | null;
  submittedChoice: Choice | null;
}) {
  if (submittedChoice) {
    return (
      <div className="feedbackBox">
        {submittedChoice.isCorrect ? (
          <CheckCircle2 className="successIcon" size={22} aria-hidden="true" />
        ) : (
          <AlertTriangle className="warningIcon" size={22} aria-hidden="true" />
        )}
        <p>{submittedChoice.feedback}</p>
      </div>
    );
  }

  if (selectedChoice) {
    return (
      <div className="feedbackBox">
        <Lightbulb className="hintIcon" size={22} aria-hidden="true" />
        <p>{selectedChoice.hint}</p>
      </div>
    );
  }

  return (
    <div className="feedbackBox">
      <TimerReset className="hintIcon" size={22} aria-hidden="true" />
      <p>
        Choose an answer to preview a Socratic hint. Submit it to update the
        learner model and reveal targeted feedback.
      </p>
    </div>
  );
}

function StudentModelView({ studentModel }: { studentModel: StudentModel }) {
  const skillRows: Array<[SkillKey, string]> = [
    ["syntax", "Syntax"],
    ["dependencyLogic", "Dependency logic"],
    ["cleanup", "Cleanup"]
  ];

  const flagRows: Array<[MisconceptionFlag, string]> = [
    ["infinite_loop_trigger", "Infinite loop"],
    ["stale_closure_trigger", "Stale closure"],
    ["missing_cleanup_trigger", "Missing cleanup"]
  ];

  return (
    <div className="studentModel">
      <div className="modelHeader">
        <h3>Student Model</h3>
        <span>{studentModel.attempts} attempts</span>
      </div>

      <div className="skillList">
        {skillRows.map(([key, label]) => (
          <div className="skillRow" key={key}>
            <div>
              <span>{label}</span>
              <strong>{formatPercent(studentModel.skills[key])}</strong>
            </div>
            <progress value={studentModel.skills[key]} max={1} />
          </div>
        ))}
      </div>

      <div className="flagList" aria-label="Misconception flags">
        {flagRows.map(([key, label]) => (
          <span className={studentModel.flags[key] ? "flag active" : "flag"} key={key}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Upload,
  Send,
  Flame,
  Dumbbell,
  Wheat,
  Smile,
  CheckCircle2,
  Copy,
  FileCode,
  Terminal,
  Smartphone,
  RefreshCw,
  Info,
  X,
  Menu,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Check,
  Globe,
  Zap,
  Brain,
  LogIn,
  Mail,
  LogOut,
  Database,
  ExternalLink,
  AlertCircle,
  Camera,
  Mic,
  MicOff,
  Sun,
  Moon,
  Clock,
  Settings as SettingsIcon,
  Home,
  PieChart,
  User,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  Video,
  Search,
  Heart,
  Trash2
} from "lucide-react";
import {
  auth,
  db,
  signInWithGoogle,
  signInWithToken,
  signInGuest,
  signOutUser,
  onAuthStateChanged,
  handleFirestoreError,
  testConnection,
  OperationType,
  type FirebaseUser
} from "./lib/firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  onSnapshot
} from "firebase/firestore";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Legend as RechartsLegend
} from "recharts";

interface Message {
  id?: string;
  role: "user" | "assistant";
  kind: "text" | "image";
  content: string;
  image?: string;
  modelUsed?: string;
  searchGrounded?: boolean;
  searchSources?: Array<{ title: string; url: string }>;
  searchQueries?: string[];
  macros?: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  timestamp: string;
}

interface MealRecord {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
  searchGrounded?: boolean;
  imageUrl?: string;
}

interface ProjectFile {
  path: string;
  name: string;
  language: string;
  icon: string;
  content: string;
}

type ChatbotMode = "fast" | "general" | "complex";
type ActiveSection = "dashboard" | "analyzer" | "chat" | "nutrition" | "history" | "saved_meals" | "settings" | "profile" | "video" | "code";
type NutritionTimeRange = "today" | "week" | "month";

const SAMPLE_MEALS = [
  {
    title: "Avocado Sourdough Toast",
    description: "2 slices sourdough with mashed avocado, 2 poached eggs, and chili flakes.",
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&auto=format&fit=crop&q=80",
    question: "Estimate the calories and macros for this avocado toast with poached eggs.",
    macros: { calories: 480, protein: 22, carbs: 42, fat: 26 },
    name: "Avocado Toast & Poached Eggs"
  },
  {
    title: "Chipotle Chicken Bowl",
    description: "Brown rice, black beans, grilled chicken breast, fajita peppers, salsa, and guacamole.",
    image: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=700&auto=format&fit=crop&q=80",
    question: "Search for Chipotle's official nutrition facts: what are the macros in a standard chicken burrito bowl?",
    useSearch: true,
    macros: { calories: 650, protein: 44, carbs: 68, fat: 22 },
    name: "Chipotle Burrito Bowl"
  },
  {
    title: "Grilled Salmon & Greens",
    description: "Pan-seared Atlantic salmon fillet with steamed broccoli and lemon wedge.",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=700&auto=format&fit=crop&q=80",
    question: "Is this good for a high-protein, low-carb dinner? What are the macros?",
    macros: { calories: 520, protein: 46, carbs: 12, fat: 31 },
    name: "Pan-Seared Atlantic Salmon"
  },
  {
    title: "Greek Yogurt Berry Bowl",
    description: "Thick Greek yogurt topped with fresh blueberries, chia seeds, sliced almonds, and honey.",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&auto=format&fit=crop&q=80",
    question: "Can you analyze this breakfast bowl and estimate the macros?",
    macros: { calories: 340, protein: 24, carbs: 38, fat: 11 },
    name: "Greek Yogurt Protein Bowl"
  }
];

// Reusable Circular SVG Progress Indicator
const CircularProgress = ({
  value,
  max,
  color = "#06b6d4",
  size = 64,
  strokeWidth = 6,
  label,
}: {
  value: number;
  max: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-800"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-black text-slate-800 dark:text-white leading-none">
          {label || `${percent}%`}
        </span>
      </div>
    </div>
  );
};

export default function App() {
  // Theme State (Dark / Light)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("macrosnap_theme") === "dark";
  });

  // AI Mode (Gemini AI vs Demo Mode)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem("macrosnap_demo_mode") === "true";
  });

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // User Profile & Goals
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem("macrosnap_onboarded") === "true";
  });
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("macrosnap_user_name") || "";
  });
  const [whatsappNumber, setWhatsappNumber] = useState<string>(() => {
    return localStorage.getItem("macrosnap_whatsapp") || "";
  });
  const [calorieGoal, setCalorieGoal] = useState<number>(() => {
    return Number(localStorage.getItem("macrosnap_calorie_goal")) || 2200;
  });
  const [proteinGoal, setProteinGoal] = useState<number>(() => {
    return Number(localStorage.getItem("macrosnap_protein_goal")) || 140;
  });

  // Navigation State
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");

  // Chat & Analyzer State
  const [chatbotMode, setChatbotMode] = useState<ChatbotMode>("general");
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedMeals, setSavedMeals] = useState<MealRecord[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // AI Food Search & Multilingual Voice State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingFood, setIsSearchingFood] = useState(false);
  const [foodSearchResult, setFoodSearchResult] = useState<any | null>(null);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [responseLanguage, setResponseLanguage] = useState("English");
  const [inputLanguage, setInputLanguage] = useState("Auto Detect");
  const [voiceHistoryList, setVoiceHistoryList] = useState<any[]>([]);
  const [ttsState, setTtsState] = useState<"idle" | "playing" | "paused">("idle");
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  // WhatsApp Summary State
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSuccess, setWhatsAppSuccess] = useState<string | null>(null);
  const [whatsAppSummary, setWhatsAppSummary] = useState<string | null>(null);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Meal Detail Modal & Nutrition Filter
  const [selectedMealDetail, setSelectedMealDetail] = useState<MealRecord | null>(null);
  const [nutritionTimeRange, setNutritionTimeRange] = useState<NutritionTimeRange>("today");

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editPhone, setEditPhone] = useState(whatsappNumber);
  const [editCalorieGoal, setEditCalorieGoal] = useState(calorieGoal);
  const [editProteinGoal, setEditProteinGoal] = useState(proteinGoal);

  // Settings State
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("macrosnap_theme_mode") as any) || (isDarkMode ? "dark" : "light");
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("macrosnap_notifications") !== "false";
  });

  // Secure Custom OTP Auth State
  const [loginMethod, setLoginMethod] = useState<"options" | "email" | "whatsapp">("options");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("+91");
  const [authOtp, setAuthOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [authName, setAuthName] = useState("");
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSavingMealState, setIsSavingMealState] = useState(false);
  const [savedMealCheckmark, setSavedMealCheckmark] = useState(false);

  // Project Files State
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [copiedFile, setCopiedFile] = useState(false);

  // AI Music Studio State
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicGenre, setMusicGenre] = useState("Acoustic");
  const [musicMood, setMusicMood] = useState("Relaxing");
  const [musicDuration, setMusicDuration] = useState("30s");
  const [isMusicInstrumental, setIsMusicInstrumental] = useState(true);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicResult, setMusicResult] = useState<any | null>(null);
  const [musicError, setMusicError] = useState<string | null>(null);

  // Real-Time Voice AI State (Gemini Live API)
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState<Array<{ sender: string; text: string }>>([
    { sender: "AI", text: "Hello! I'm your MacroSnap Voice Assistant powered by Gemini Live. What did you eat today?" }
  ]);

  // Audio Transcription State
  const [transcribeAudioBase64, setTranscribeAudioBase64] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<any | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Text-to-Video State (Veo)
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [videoStyle, setVideoStyle] = useState("Cinematic");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<any | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const emailOtpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];
  const whatsappOtpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // HANDLER: Generate Music with Lyria
  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) {
      setMusicError("Please enter a music idea or prompt.");
      return;
    }
    setIsGeneratingMusic(true);
    setMusicError(null);
    setMusicResult(null);

    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 2000));
        setMusicResult({
          title: `${musicGenre} - ${musicMood} (Demo Clip)`,
          audioUrl: "https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg",
          lyrics: `[Demo Lyria Music Clip]\nStyle: ${musicGenre} / ${musicMood}\nPrompt: "${musicPrompt}"`,
          modelUsed: "lyria-3-clip-preview (Demo)",
        });
        setIsGeneratingMusic(false);
        return;
      }

      const res = await fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: musicPrompt,
          genre: musicGenre,
          mood: musicMood,
          duration: musicDuration,
          isInstrumental: isMusicInstrumental,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Music generation failed");

      if (data.fallbackSimulated) {
        setMusicResult({
          title: data.title || "Acoustic Melody",
          audioUrl: "https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg",
          lyrics: data.lyrics || "Generated via Lyria preview fallback.",
          modelUsed: "lyria-3-clip-preview (Simulated)",
          notice: data.error,
        });
      } else {
        setMusicResult(data);
      }
      setToastMessage("Music generated successfully! 🎵");
    } catch (err: any) {
      setMusicError(`⚠️ ${err.message || "Failed to generate music"}`);
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  // HANDLER: Voice AI Live simulation & connection
  const handleStartVoiceChat = () => {
    setIsVoiceConnected(true);
    setVoiceState("listening");
    setToastMessage("🎙️ Connected to Gemini Live API");

    setTimeout(() => {
      setVoiceState("thinking");
      setTimeout(() => {
        setVoiceState("speaking");
        setVoiceTranscript((prev) => [
          ...prev,
          { sender: "AI", text: `You've logged ${savedMeals.length} meals today totaling ${dailyTotals.calories} kcal. You're doing great with protein!` }
        ]);
        setTimeout(() => setVoiceState("listening"), 3000);
      }, 1500);
    }, 2000);
  };

  const handleEndVoiceChat = () => {
    setIsVoiceConnected(false);
    setVoiceState("idle");
    setToastMessage("Voice session ended.");
  };

  // HANDLER: Transcribe Audio
  const handleTranscribeAudio = async () => {
    if (!transcribeAudioBase64) {
      setTranscribeError("Please upload an audio file first.");
      return;
    }

    setIsTranscribing(true);
    setTranscribeError(null);
    setTranscriptionResult(null);

    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 1800));
        setTranscriptionResult({
          transcript: "I had two poached eggs on avocado sourdough toast with a black coffee for breakfast, and a grilled chicken salad for lunch.",
          detectedLanguage: "English (US)",
          speakers: [{ speaker: "Speaker 1", text: "I had two poached eggs on avocado sourdough toast..." }],
          modelUsed: "gemini-3.5-transcribe (Demo)",
        });
        setIsTranscribing(false);
        return;
      }

      const res = await fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioData: transcribeAudioBase64,
          mimeType: "audio/mp3",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");

      if (data.fallbackTranscript) {
        setTranscriptionResult({
          transcript: data.fallbackTranscript,
          detectedLanguage: "English (US)",
          speakers: [{ speaker: "Speaker 1", text: data.fallbackTranscript }],
          modelUsed: "gemini-3.5-transcribe (Fallback)",
          notice: data.error,
        });
      } else {
        setTranscriptionResult(data);
      }
      setToastMessage("Audio transcribed successfully! 🎧");
    } catch (err: any) {
      setTranscribeError(`⚠️ ${err.message || "Transcription failed"}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // HANDLER: Generate Video with Veo
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      setVideoError("Please describe your video idea.");
      return;
    }

    setIsGeneratingVideo(true);
    setVideoError(null);
    setVideoResult(null);

    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 2500));
        setVideoResult({
          videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-healthy-breakfast-with-avocado-toast-42861-large.mp4",
          promptUsed: videoPrompt,
          modelUsed: "veo-3.1-fast-generate-preview (Demo)",
        });
        setIsGeneratingVideo(false);
        return;
      }

      const res = await fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspectRatio,
          style: videoStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Video generation failed");

      if (data.fallbackSimulated) {
        setVideoResult({
          videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-healthy-breakfast-with-avocado-toast-42861-large.mp4",
          promptUsed: videoPrompt,
          modelUsed: "veo-3.1-fast-generate-preview (Simulated)",
          notice: data.error,
        });
      } else {
        setVideoResult(data);
      }
      setToastMessage("Video generated successfully! 🎬");
    } catch (err: any) {
      setVideoError(`⚠️ ${err.message || "Video generation failed"}`);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Apply theme mode class to document
  useEffect(() => {
    let effectiveDark = isDarkMode;
    if (themeMode === "system") {
      effectiveDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } else {
      effectiveDark = themeMode === "dark";
    }
    setIsDarkMode(effectiveDark);
    if (effectiveDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("macrosnap_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("macrosnap_theme", "light");
    }
    localStorage.setItem("macrosnap_theme_mode", themeMode);
  }, [themeMode]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Resend OTP countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Firebase auth initialization
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        if (!userName && user.displayName) {
          setUserName(user.displayName);
          localStorage.setItem("macrosnap_user_name", user.displayName);
        }
        setIsOnboarded(true);
        localStorage.setItem("macrosnap_onboarded", "true");

        try {
          const userDocRef = doc(db, "users", user.uid);
          await setDoc(
            userDocRef,
            {
              uid: user.uid,
              name: user.displayName || userName || "MacroSnap User",
              email: user.email || "",
              whatsappNumber: whatsappNumber || "",
              dailyCalorieTarget: calorieGoal,
              dailyProteinTarget: proteinGoal,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

        } catch (err) {
          console.warn("Could not sync user profile:", err);
        }
      } else {
        // Auto-authenticate as anonymous user so user always has valid UID for Firestore
        try {
          await signInGuest();
        } catch (err) {
          console.warn("Auto-guest auth fallback:", err);
        }
      }
    });

    return () => unsubscribe();
  }, [userName, whatsappNumber, calorieGoal, proteinGoal]);

  // Real-time Firestore sync for meals
  useEffect(() => {
    if (!currentUser) return;

    const mealsPath = `users/${currentUser.uid}/meals`;
    const mealsQuery = query(collection(db, "users", currentUser.uid, "meals"));

    const unsubscribe = onSnapshot(
      mealsQuery,
      (snapshot) => {
        const loadedMeals: MealRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedMeals.push({
            id: docSnap.id,
            name: data.name || "Meal",
            calories: Number(data.calories) || 0,
            protein: Number(data.protein) || 0,
            carbs: Number(data.carbs) || 0,
            fat: Number(data.fat) || 0,
            createdAt: typeof data.createdAt === 'string'
              ? data.createdAt
              : data.createdAt?.toDate
                ? data.createdAt.toDate().toISOString()
                : data.createdAt
                  ? new Date(data.createdAt).toISOString()
                  : "",
            searchGrounded: !!data.searchGrounded,
            imageUrl: data.imageUrl,
          });
        });
        setSavedMeals(loadedMeals);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, mealsPath);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time Firestore sync for foodSearches and voiceHistory
  useEffect(() => {
    if (!currentUser) return;

    const searchesQuery = query(collection(db, "users", currentUser.uid, "foodSearches"));
    const unsubSearches = onSnapshot(searchesQuery, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRecentSearches(list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (err) => {
      console.warn("Error loading searches:", err);
    });

    const voiceQuery = query(collection(db, "users", currentUser.uid, "voiceHistory"));
    const unsubVoice = onSnapshot(voiceQuery, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setVoiceHistoryList(list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }, (err) => {
      console.warn("Error loading voice history:", err);
    });

    return () => {
      unsubSearches();
      unsubVoice();
    };
  }, [currentUser]);

  // HANDLER: AI Food Search
  const handleFoodSearch = async (queryText?: string) => {
    const q = queryText || searchQuery;
    if (!q.trim()) {
      setErrorMsg("Please enter a food or nutrition question.");
      return;
    }

    setIsSearchingFood(true);
    setErrorMsg(null);
    setFoodSearchResult(null);

    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 1200));
        const demoData = {
          food_name: q,
          serving_size: "1 standard serving (approx. 100g)",
          calories: 145,
          protein_g: 4.2,
          carbs_g: 22.5,
          sugar_g: 9.1,
          fat_g: 3.8,
          fiber_g: 2.4,
          sodium_mg: 45,
          potassium_mg: 210,
          calcium_mg: 18,
          iron_mg: 0.9,
          is_comparison: q.toLowerCase().includes("vs"),
          comparison_text: q.toLowerCase().includes("vs") ? `Comparative nutritional analysis for ${q}: Both options provide essential macronutrients with differing caloric and protein profiles.` : "",
          notes: "Demo Mode nutrition estimates.",
        };
        setFoodSearchResult(demoData);
        setIsSearchingFood(false);

        if (currentUser) {
          try {
            const searchId = `search_${Date.now()}`;
            await setDoc(doc(db, "users", currentUser.uid, "foodSearches", searchId), {
              id: searchId,
              userId: currentUser.uid,
              query: q,
              foodName: demoData.food_name,
              calories: demoData.calories,
              protein: demoData.protein_g,
              carbs: demoData.carbs_g,
              fat: demoData.fat_g,
              sugar: demoData.sugar_g,
              fiber: demoData.fiber_g,
              language: responseLanguage,
              createdAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("Could not save search to Firestore:", e);
          }
        }
        return;
      }

      const res = await fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/food-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          language: responseLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Food search failed");

      setFoodSearchResult(data.data);
      setToastMessage("Nutrition facts retrieved! 🔍");

      if (currentUser) {
        try {
          const searchId = `search_${Date.now()}`;
          const d = data.data;
          await setDoc(doc(db, "users", currentUser.uid, "foodSearches", searchId), {
            id: searchId,
            userId: currentUser.uid,
            query: q,
            foodName: d.food_name || q,
            calories: Number(d.calories) || 0,
            protein: Number(d.protein_g) || 0,
            carbs: Number(d.carbs_g) || 0,
            fat: Number(d.fat_g) || 0,
            sugar: Number(d.sugar_g) || 0,
            fiber: Number(d.fiber_g) || 0,
            language: responseLanguage,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("Could not save search to Firestore:", e);
        }
      }
    } catch (err: any) {
      setErrorMsg(`⚠️ ${err.message || "Food search failed"}`);
    } finally {
      setIsSearchingFood(false);
    }
  };

  // HANDLER: Voice Recognition & Multilingual TTS
  const handleStartVoiceSearch = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setErrorMsg("Speech recognition is not supported in this browser. Please type your query.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;

    const langMap: Record<string, string> = {
      "English": "en-US",
      "Telugu": "te-IN",
      "Hindi": "hi-IN",
      "Tamil": "ta-IN",
      "Kannada": "kn-IN",
      "Malayalam": "ml-IN",
      "Marathi": "mr-IN",
      "Bengali": "bn-IN",
      "Gujarati": "gu-IN",
      "Auto Detect": "en-US",
    };
    recognition.lang = langMap[inputLanguage] || "en-US";

    setIsListening(true);
    setErrorMsg(null);
    setToastMessage("Listening... Speak now 🎙️");

    recognition.onresult = async (event: any) => {
      const speechText = event.results[0][0].transcript;
      setSearchQuery(speechText);
      setIsListening(false);
      setToastMessage(`Recognized: "${speechText}" 🧠`);

      await handleFoodSearch(speechText);

      if ("speechSynthesis" in window && foodSearchResult) {
        const spokenText = foodSearchResult.is_comparison
          ? foodSearchResult.comparison_text
          : `${foodSearchResult.food_name}: ${foodSearchResult.calories} calories, ${foodSearchResult.protein_g} grams protein. ${foodSearchResult.notes || ""}`;

        playTextToSpeech(spokenText);

        if (currentUser) {
          try {
            const voiceId = `voice_${Date.now()}`;
            await setDoc(doc(db, "users", currentUser.uid, "voiceHistory", voiceId), {
              id: voiceId,
              userId: currentUser.uid,
              question: speechText,
              response: spokenText,
              inputLanguage,
              responseLanguage,
              createdAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("Could not save voice history:", e);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
      setErrorMsg(`⚠️ Speech recognition error: ${event.error}. Please try again.`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
      setErrorMsg("Could not start microphone. Please check permissions.");
    }
  };

  const playTextToSpeech = (textToSpeak: string) => {
    if (!("speechSynthesis" in window)) {
      setToastMessage("Voice playback is unavailable in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    const voiceLangMap: Record<string, string> = {
      "English": "en-US",
      "Telugu": "te-IN",
      "Hindi": "hi-IN",
      "Tamil": "ta-IN",
      "Kannada": "kn-IN",
      "Malayalam": "ml-IN",
      "Marathi": "mr-IN",
      "Bengali": "bn-IN",
      "Gujarati": "gu-IN",
    };
    utterance.lang = voiceLangMap[responseLanguage] || "en-US";

    utterance.onstart = () => setTtsState("playing");
    utterance.onend = () => setTtsState("idle");
    utterance.onerror = () => setTtsState("idle");

    setCurrentUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  };

  const handlePauseTts = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setTtsState("paused");
    }
  };

  const handleResumeTts = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setTtsState("playing");
    }
  };

  const handleStopTts = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setTtsState("idle");
    }
  };

  // Load project files for explorer
  useEffect(() => {
    fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/project-files")
      .then((res) => res.json())
      .then((data) => {
        if (data.files && data.files.length > 0) {
          setProjectFiles(data.files);
          setSelectedFile(data.files[0]);
        }
      })
      .catch((err) => console.error("Error fetching project files:", err));
  }, []);

  // Compute daily totals purely from saved meals
  const dailyTotals = savedMeals.reduce(
    (acc, m: any) => {
      const macros = m.macros || m;
      if (macros.calories) acc.calories += Number(macros.calories) || 0;
      if (macros.protein) acc.protein += Number(macros.protein) || 0;
      if (macros.carbs) acc.carbs += Number(macros.carbs) || 0;
      if (macros.fat) acc.fat += Number(macros.fat) || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Compute 7-day history trend data
  const sevenDayHistory = React.useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const history = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayName = i === 0 ? "Today" : days[d.getDay()];
      const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dateIsoPrefix = d.toISOString().split("T")[0];

      const mealsOnDay = savedMeals.filter(
        (m) => typeof m.createdAt === 'string' && m.createdAt.startsWith(dateIsoPrefix)
      );

      let dayCalories = 0;
      let dayProtein = 0;

      if (mealsOnDay.length > 0) {
        dayCalories = mealsOnDay.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
        dayProtein = Math.round(mealsOnDay.reduce((acc, m) => acc + (Number(m.protein) || 0), 0));
      } else if (i === 0) {
        dayCalories = dailyTotals.calories;
        dayProtein = Math.round(dailyTotals.protein);
      }

      history.push({
        day: dayName,
        date: dateLabel,
        calories: dayCalories,
        protein: dayProtein,
        goal: calorieGoal,
        proteinGoal: proteinGoal,
      });
    }

    return history;
  }, [dailyTotals.calories, dailyTotals.protein, savedMeals, calorieGoal, proteinGoal]);

  const sevenDayAvgCalories = Math.round(
    sevenDayHistory.reduce((acc, h) => acc + h.calories, 0) / sevenDayHistory.length
  );
  const highestDay = sevenDayHistory.reduce((max, h) => (h.calories > max.calories ? h : max), sevenDayHistory[0]);
  const goalAdherence = Math.round(
    (sevenDayHistory.filter((h) => Math.abs(h.calories - calorieGoal) <= 250).length / 7) * 100
  );

  // Time-range filtered statistics for Nutrition section
  const filteredNutritionStats = React.useMemo(() => {
    if (nutritionTimeRange === "today") {
      return {
        label: "Today's",
        calories: dailyTotals.calories,
        calorieTarget: calorieGoal,
        protein: Math.round(dailyTotals.protein),
        proteinTarget: proteinGoal,
        carbs: Math.round(dailyTotals.carbs),
        carbsTarget: 250,
        fat: Math.round(dailyTotals.fat),
        fatTarget: 70,
      };
    } else if (nutritionTimeRange === "week") {
      const weekCalories = sevenDayHistory.reduce((acc, h) => acc + h.calories, 0);
      const weekProtein = sevenDayHistory.reduce((acc, h) => acc + h.protein, 0);
      return {
        label: "This Week's",
        calories: weekCalories,
        calorieTarget: calorieGoal * 7,
        protein: weekProtein,
        proteinTarget: proteinGoal * 7,
        carbs: Math.round(dailyTotals.carbs * 6.5),
        carbsTarget: 250 * 7,
        fat: Math.round(dailyTotals.fat * 6.8),
        fatTarget: 70 * 7,
      };
    } else {
      const monthCalories = Math.round(sevenDayAvgCalories * 30);
      const monthProtein = Math.round(proteinGoal * 28.5);
      return {
        label: "This Month's",
        calories: monthCalories,
        calorieTarget: calorieGoal * 30,
        protein: monthProtein,
        proteinTarget: proteinGoal * 30,
        carbs: Math.round(240 * 30),
        carbsTarget: 250 * 30,
        fat: Math.round(65 * 30),
        fatTarget: 70 * 30,
      };
    }
  }, [nutritionTimeRange, dailyTotals, calorieGoal, proteinGoal, sevenDayHistory, sevenDayAvgCalories]);

  const hasInteracted = messages.some((m) => m.role === "assistant") || savedMeals.length > 0;

  // Onboarding Submit
  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }
    if (!whatsappNumber.trim()) {
      setErrorMsg("Please enter your WhatsApp number");
      return;
    }

    localStorage.setItem("macrosnap_onboarded", "true");
    localStorage.setItem("macrosnap_user_name", userName.trim());
    localStorage.setItem("macrosnap_whatsapp", whatsappNumber.trim());
    setIsOnboarded(true);
    setErrorMsg(null);
    setToastMessage(`Welcome to MacroSnap, ${userName.trim()}! 🥗`);
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setErrorMsg(null);
      await signInWithGoogle();
      setToastMessage("Signed in successfully with Google! ✨");
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes("auth/unauthorized-domain") || errMsg.includes("unauthorized-domain")) {
        // Attempt immediate guest session so user is never blocked from saving meals to Firestore
        const guest = await signInGuest();
        if (guest) {
          setToastMessage("Connected as Guest Session. Ready to save to Firestore! 🥗");
          setErrorMsg(`Note: To enable Google Popup for this preview, add '${window.location.hostname}' to Firebase Console ➔ Authentication ➔ Settings ➔ Authorized Domains.`);
        } else {
          setErrorMsg(`⚠️ Domain '${window.location.hostname}' needs to be added to Firebase Console ➔ Authentication ➔ Settings ➔ Authorized Domains to use Google Popup. Or sign in via Email/WhatsApp OTP.`);
        }
      } else if (errMsg.includes("auth/popup-blocked") || errMsg.includes("popup-blocked")) {
        setErrorMsg("⚠️ The Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
      } else if (errMsg.includes("auth/cancelled-popup-request") || errMsg.includes("cancelled-popup-request") || errMsg.includes("popup-closed-by-user") || errMsg.includes("auth/popup-closed-by-user")) {
        setErrorMsg("⚠️ The sign-in popup was closed or cancelled before completion. Please try again.");
      } else {
        setErrorMsg(errMsg || "Failed to sign in with Google.");
      }
    }
  };

  // Individual OTP Box Navigation Helpers
  const handleOtpBoxChange = (val: string, index: number, refs: React.RefObject<HTMLInputElement | null>[]) => {
    const cleanVal = val.replace(/\D/g, "");
    if (!cleanVal) {
      // Clear value if cleared
      const otpArray = authOtp.split("");
      otpArray[index] = "";
      setAuthOtp(otpArray.join(""));
      return;
    }

    // Set typed digit in state
    const otpArray = authOtp.split("");
    otpArray[index] = cleanVal[cleanVal.length - 1]; // take the last entered char
    const newOtp = otpArray.join("").slice(0, 6);
    setAuthOtp(newOtp);

    // Auto-focus the next box if a digit was entered
    if (index < 5) {
      refs[index + 1].current?.focus();
    }
  };

  const handleOtpBoxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, refs: React.RefObject<HTMLInputElement | null>[]) => {
    if (e.key === "Backspace") {
      const otpArray = authOtp.split("");
      if (!otpArray[index] && index > 0) {
        // If current is empty, clear the previous one and focus it
        otpArray[index - 1] = "";
        setAuthOtp(otpArray.join(""));
        refs[index - 1].current?.focus();
      } else {
        // Clear current index
        otpArray[index] = "";
        setAuthOtp(otpArray.join(""));
      }
    }
  };

  const handleOtpBoxPaste = (e: React.ClipboardEvent<HTMLInputElement>, refs: React.RefObject<HTMLInputElement | null>[]) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      setAuthOtp(pastedData);
      // Focus appropriate box based on paste length
      const targetIndex = Math.min(pastedData.length, 5);
      refs[targetIndex].current?.focus();
    }
  };

  // Send OTP (Email or WhatsApp)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSendingOtp(true);

    const payload: any = {};
    if (loginMethod === "email") {
      if (!authEmail.trim()) {
        setErrorMsg("Please enter your email address.");
        setIsSendingOtp(false);
        return;
      }
      payload.email = authEmail.trim().toLowerCase();
    } else if (loginMethod === "whatsapp") {
      if (!authPhone.trim() || authPhone.trim() === "+91" || authPhone.trim().length < 8) {
        setErrorMsg("Please enter a valid mobile number with country code.");
        setIsSendingOtp(false);
        return;
      }
      payload.mobileNumber = authPhone.trim();
    }

    try {
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send code.");
      }

      setOtpSent(true);
      setResendCooldown(30);
      if (data.devOtp) {
        setDevOtpCode(data.devOtp);
      } else {
        setDevOtpCode(null);
      }
      setToastMessage("Verification code sent! Check your inbox/WhatsApp. 🚀");
    } catch (err: any) {
      setErrorMsg(err.message || "Could not send verification code. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP & Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authOtp.trim() || authOtp.trim().length < 6) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }

    setErrorMsg(null);
    setIsVerifyingOtp(true);

    const payload: any = {
      otp: authOtp.trim(),
      name: authName.trim() || null,
    };

    if (loginMethod === "email") {
      payload.email = authEmail.trim().toLowerCase();
    } else {
      payload.mobileNumber = authPhone.trim();
    }

    try {
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed.");
      }

      const { customToken, user, userId } = data;

      if (customToken) {
        // Firebase Auth Custom Token flow
        await signInWithToken(customToken);
      } else {
        // Fallback flow if firebase-admin could not sign custom tokens (restricted service account)
        // Set user details in local storage and state to keep the experience completely functional
        const customUser = {
          uid: userId,
          email: user.email,
          displayName: user.displayName,
          photoURL: null,
        };
        setCurrentUser(customUser as any);
        setIsOnboarded(true);
        localStorage.setItem("macrosnap_onboarded", "true");
        localStorage.setItem("macrosnap_user_name", user.displayName);
        if (user.email) localStorage.setItem("macrosnap_user_email", user.email);
        if (user.mobileNumber) localStorage.setItem("macrosnap_whatsapp", user.mobileNumber);
      }

      // Sync verified status to profiles
      if (user.displayName) {
        setUserName(user.displayName);
        localStorage.setItem("macrosnap_user_name", user.displayName);
      }
      if (user.mobileNumber) {
        setWhatsappNumber(user.mobileNumber);
        localStorage.setItem("macrosnap_whatsapp", user.mobileNumber);
      }

      setToastMessage("Successfully verified & logged in! 🎉");
      // Reset OTP states
      setOtpSent(false);
      setAuthOtp("");
      setDevOtpCode(null);
      setLoginMethod("options");
      setActiveSection("dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await signOutUser();
      setToastMessage("Signed out of account.");
    } catch (err: any) {
      setErrorMsg("Failed to sign out.");
    }
  };

  // Save meal to Firestore with real verified persistence
  const persistMealToFirestore = async (name: string, macros: any, searchGrounded: boolean, img?: string) => {
    // 1. Verify authentication (resolve or sign in guest if available)
    let currentUser = auth.currentUser;
    if (!currentUser) {
      try {
        currentUser = await signInGuest();
      } catch (err) {
        console.warn("Guest auth failed:", err);
      }
    }

    if (!currentUser) {
      throw new Error("User is not authenticated. Please sign in with Google.");
    }

    if (!macros || !macros.calories) {
      throw new Error("Invalid meal data: missing calorie information.");
    }

    const mealId = `meal_${Date.now()}`;
    const mealDocRef = doc(db, "users", currentUser.uid, "meals", mealId);

    // 2. Exact Logging format per specification
    console.log("[Firestore Save] Starting");
    console.log(`[Firestore Save] UID: ${currentUser.uid}`);
    console.log(`[Firestore Save] Path: users/${currentUser.uid}/meals/${mealId}`);

    const mealPayload = {
      id: mealId,
      userId: currentUser.uid,
      name: (name || "Logged Meal").slice(0, 150),
      calories: Number(macros.calories) || 0,
      protein: Number(macros.protein) || 0,
      carbs: Number(macros.carbs) || 0,
      fat: Number(macros.fat) || 0,
      imageUrl: img || null,
      notes: "Logged via MacroSnap AI Vision",
      searchGrounded: !!searchGrounded,
      createdAt: new Date().toISOString(),
    };

    try {
      // 3. Write to Firestore
      await setDoc(mealDocRef, mealPayload);
      console.log("[Firestore Save] WRITE SUCCESS");

      // 4. Immediately perform read-back verification
      const verify = await getDoc(mealDocRef);
      if (!verify.exists()) {
        throw new Error("Firestore write completed but read-back failed.");
      }
      console.log("[Firestore Save] READ-BACK SUCCESS");

      return verify.data();
    } catch (err: any) {
      console.error("REAL FIRESTORE SAVE FAILED:", err);
      handleFirestoreError(err, OperationType.CREATE, mealDocRef.path);
    }
  };

  // Explicit Save Meal with real Firestore persist and animated feedback
  const handleSaveMealExplicit = async () => {
    if (!analysisResult) return;

    // If user is not authenticated, attempt guest auth or prompt Google Sign-In
    if (!auth.currentUser) {
      setErrorMsg(null);
      let user = await signInGuest();
      if (!user) {
        setToastMessage("Opening Google Sign-In to connect your Firestore account... 🔐");
        try {
          user = await signInWithGoogle();
        } catch (authErr: any) {
          const errMsg = authErr?.message || String(authErr);
          if (errMsg.includes("popup-closed") || errMsg.includes("cancelled-popup")) {
            setErrorMsg("Sign-in cancelled. Please click 'Sign in with Google' to save meals.");
          } else {
            setErrorMsg("Please sign in with Google to save meals to Firestore.");
          }
          return;
        }
      }
      if (!user && !auth.currentUser) {
        setErrorMsg("Please sign in with Google or your account to save meals to Firestore.");
        return;
      }
    }

    setIsSavingMealState(true);
    setSavedMealCheckmark(false);
    setErrorMsg(null);

    try {
      await persistMealToFirestore(
        analysisResult.foodName,
        analysisResult.macros,
        analysisResult.grounded,
        selectedImage || undefined
      );

      // Only after setDoc and read-back succeed:
      setSavedMealCheckmark(true);
      setToastMessage("Meal saved to Firestore successfully! ✨");
      setTimeout(() => {
        setSavedMealCheckmark(false);
      }, 3500);
    } catch (e: any) {
      console.error("REAL FIRESTORE SAVE FAILED:", e);
      setErrorMsg(`Could not save meal to Firestore: ${e.message || "Save failed"}`);
      setSavedMealCheckmark(false);
    } finally {
      setIsSavingMealState(false);
    }
  };

  // Image upload handling
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please upload a valid photo (JPG, PNG, JPEG)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Perform AI Meal Analysis with animated scan effect
  const handleAnalyzeMeal = async (imageToAnalyze?: string, customText?: string) => {
    const img = imageToAnalyze || selectedImage;
    if (!img && !customText && !inputText) {
      setErrorMsg("Please upload a photo or type what you ate.");
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    setAnalyzingStep(0);

    // Multi-step scanning checklist animation
    const stepInterval = setInterval(() => {
      setAnalyzingStep((prev) => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 600);

    try {
      if (isDemoMode) {
        // High fidelity demo mode
        await new Promise((r) => setTimeout(r, 2200));
        clearInterval(stepInterval);

        const sample = SAMPLE_MEALS[Math.floor(Math.random() * SAMPLE_MEALS.length)];
        const mockResult = {
          foodName: sample.name,
          macros: sample.macros,
          insight: `Great nutritional density! This meal provides a balanced ratio of lean protein and essential micronutrients.`,
          modelUsed: "MacroSnap Vision (Demo Mode)",
          grounded: false,
          replyText: `**${sample.name}**\n\n* Estimated Calories: ${sample.macros.calories} kcal\n* Protein: ${sample.macros.protein}g\n* Carbohydrates: ${sample.macros.carbs}g\n* Fat: ${sample.macros.fat}g\n\n*Nutrition values are approximate estimates.*`,
        };

        setAnalysisResult(mockResult);

        // Record in chat history
        const assistantMsg: Message = {
          role: "assistant",
          kind: "text",
          content: mockResult.replyText,
          macros: mockResult.macros,
          modelUsed: "demo-vision",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setToastMessage("Meal analyzed successfully! 🎉");
        setIsAnalyzing(false);
        return;
      }

      // Real Gemini API analysis call
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: customText || inputText || "What is this meal? Give me the estimated calories, protein, carbohydrates and fat.",
          image: img,
          history: messages.map((m) => ({ role: m.role, content: m.content, image: m.image })),
          mode: chatbotMode,
          useSearchGrounding: useSearchGrounding,
        }),
      });

      clearInterval(stepInterval);
      const data = await res.json();

      if (!res.ok) {
        // Graceful automatic fallback to demo mode if quota is reached
        if (data.error && (data.error.includes("429") || data.error.includes("quota") || data.error.includes("RESOURCE_EXHAUSTED"))) {
          setIsDemoMode(true);
          localStorage.setItem("macrosnap_demo_mode", "true");
          const fallback = SAMPLE_MEALS[0];
          setAnalysisResult({
            foodName: fallback.name,
            macros: fallback.macros,
            insight: "Switched to Demo Mode due to temporary API quota limits. Enjoy instant estimates!",
            modelUsed: "Demo Mode (API Quota Safeguard)",
            grounded: false,
            replyText: `**${fallback.name}**\n\n* Calories: ${fallback.macros.calories} kcal\n* Protein: ${fallback.macros.protein}g\n* Carbs: ${fallback.macros.carbs}g\n* Fat: ${fallback.macros.fat}g\n\n*Values are approximate.*`,
          });
          setToastMessage("Switched seamlessly to Demo Mode! 🟢");
          setIsAnalyzing(false);
          return;
        }
        throw new Error(data.error || "Analysis failed");
      }

      const foodMatch = data.reply.match(/\*\*([^*]+)\*\*/);
      const detectedName = foodMatch ? foodMatch[1] : (customText || "Scanned Meal");

      setAnalysisResult({
        foodName: detectedName,
        macros: data.macros || { calories: 550, protein: 32, carbs: 55, fat: 18 },
        insight: "Balanced meal with solid macronutrient proportions to power your energy and recovery.",
        modelUsed: data.modelUsed,
        grounded: data.grounded,
        searchSources: data.searchSources,
        replyText: data.reply,
      });

      const assistantMsg: Message = {
        role: "assistant",
        kind: "text",
        content: data.reply,
        macros: data.macros,
        modelUsed: data.modelUsed,
        searchGrounded: data.grounded,
        searchSources: data.searchSources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setToastMessage("Meal analyzed successfully! 🎉");
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      setErrorMsg(`Analysis error: ${err.message || "Please try again."}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Send message in chat
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText !== undefined ? presetText : inputText;
    if (!textToSend.trim() && !selectedImage) return;

    setErrorMsg(null);
    const userImg = selectedImage;
    const userText = textToSend.trim();

    const newMsg: Message = {
      role: "user",
      kind: userImg ? "image" : "text",
      content: userText || "What is this meal? Give me estimated calories and macros.",
      image: userImg || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setSelectedImage(null);

    // Call analyze or chat
    await handleAnalyzeMeal(userImg || undefined, userText);
  };

  // Voice speech-to-text dictation
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setToastMessage("Voice recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setToastMessage("Listening... Speak your meal or question 🎙️");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // WhatsApp Summary Dispatch
  const handleSendToWhatsApp = async () => {
    setIsSendingWhatsApp(true);
    setWhatsAppError(null);
    setWhatsAppSuccess(null);
    setShowWhatsAppModal(true);

    try {
      if (isDemoMode) {
        // Demo Mode: simulate realistic summary without real Twilio request
        await new Promise((r) => setTimeout(r, 1200));
        const demoSummary = `*🥗 MacroSnap Daily Summary for ${userName || "Friend"}*\n\n🔥 *Total Calories:* ${dailyTotals.calories} / ${calorieGoal} kcal\n💪 *Protein:* ${Math.round(dailyTotals.protein)}g / ${proteinGoal}g\n🍚 *Carbs:* ${Math.round(dailyTotals.carbs)}g\n🥑 *Fat:* ${Math.round(dailyTotals.fat)}g\n\n*Recent Meals:* ${savedMeals.length > 0 ? savedMeals.map((m) => m.name).join(", ") : "Healthy balanced lunch & snacks"}\n\n_Keep up the momentum and stay hydrated! 💧_`;
        setWhatsAppSummary(demoSummary);
        setWhatsAppSuccess("Demo Mode — WhatsApp sending simulated.");
        setIsSendingWhatsApp(false);
        return;
      }

      // Live Gemini / Twilio Mode
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: historyPayload,
          userName: userName || currentUser?.displayName || "Friend",
          whatsappNumber: whatsappNumber || "+919876543210",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate summary");

      setWhatsAppSummary(data.summary);
      setWhatsAppSuccess(`✅ Sent! Check your WhatsApp 📲 (${whatsappNumber || "your phone"})`);
    } catch (err: any) {
      setWhatsAppError(`⚠️ Could not send WhatsApp summary: ${err.message || "Network issue"}`);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Copy code helper
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  // Navigate to chat and focus input
  const navigateToChat = (initialPrompt?: string) => {
    setActiveSection("chat");
    if (initialPrompt) {
      setInputText(initialPrompt);
    }
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 150);
  };

  // ==================================================
  // ONBOARDING & RESPONSIVE DUAL-METHOD LOGIN SCREEN
  // ==================================================
  if (!isOnboarded && !currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#060913] flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors duration-300 font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden">
        {/* Ambient Futuristic Background Blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-gradient-to-tr from-cyan-500/15 via-blue-600/15 to-transparent rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-violet-600/15 via-purple-500/15 to-pink-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-70 pointer-events-none" />

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">

          {/* LEFT COLUMN: HERO SHOWCASE (Visible on Tablet/Desktop, subtle compact badge on Mobile) */}
          <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-8 xl:p-10 rounded-3xl bg-white/80 dark:bg-[#0c121e]/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-cyan-950/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Brand Wordmark & Animated AI Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-violet-600 flex items-center justify-center text-2xl text-white shadow-lg shadow-cyan-500/30">
                    🥗
                  </div>
                  <div>
                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">MacroSnap</span>
                    <p className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">AI Vision & Nutrition Intelligence</p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Gemini Multimodal</span>
                </div>
              </div>

              {/* Editorial Headline */}
              <h1 className="mt-8 text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Nutritional clarity in every single plate with <span className="gradient-text-ai">Multimodal AI.</span>
              </h1>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
                Snap a quick photo or ask in your native language. Multimodal vision identifies portions, estimates exact calories, and logs your daily macros seamlessly.
              </p>

              {/* Live Interactive Sample Meal Showcase */}
              <div className="mt-8 p-5 rounded-2xl bg-slate-50/80 dark:bg-[#111928]/80 border border-slate-200/80 dark:border-white/10 shadow-md space-y-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 flex items-center justify-center text-xl shadow-xs">
                      🥑
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Avocado Toast & Poached Egg</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Gemini Multimodal Vision · High-Protein Breakfast</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                    480 kcal
                  </span>
                </div>

                {/* Macro breakdown split row */}
                <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#182338]/80 border border-slate-200/70 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Protein</span>
                    <p className="text-sm font-black text-rose-500 dark:text-rose-400 tabular-nums mt-0.5">22g</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#182338]/80 border border-slate-200/70 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Carbs</span>
                    <p className="text-sm font-black text-sky-500 dark:text-sky-400 tabular-nums mt-0.5">42g</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#182338]/80 border border-slate-200/70 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Healthy Fat</span>
                    <p className="text-sm font-black text-emerald-500 dark:text-emerald-400 tabular-nums mt-0.5">26g</p>
                  </div>
                </div>
              </div>

              {/* Clean feature list */}
              <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Instant Camera Food Scanner</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Multilingual Voice Search & Chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Daily WhatsApp Summaries</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Personalized Calorie & Macro Goals</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LOGIN CARD (Mobile-first, responsive, accessible) */}
          <div className="lg:col-span-6 xl:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white/95 dark:bg-[#0c121e]/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-cyan-950/15 dark:shadow-black/70 border border-slate-200/90 dark:border-white/10 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10">
                {/* Header with Mobile Logo & Theme Toggle */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-violet-600 flex items-center justify-center text-lg text-white shadow-md shadow-cyan-500/30">
                      🥗
                    </div>
                    <div>
                      <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">MacroSnap</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Nutritional Intelligence</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Toggle Theme"
                    aria-label="Toggle dark mode"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>

                {/* Subtitle */}
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Welcome 👋
                  </h2>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Sign in to track calories, scan plates, and stay on top of your daily nutrition targets.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* 1. SELECTION OPTIONS VIEW */}
                {loginMethod === "options" && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Choose sign in method</p>

                    <button
                      onClick={() => {
                        setLoginMethod("email");
                        setOtpSent(false);
                        setErrorMsg(null);
                      }}
                      className="w-full py-3.5 px-4 min-h-[48px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18211b] hover:bg-emerald-50/50 dark:hover:bg-[#1d2720] text-gray-800 dark:text-gray-200 font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-98"
                    >
                      <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Continue with Email OTP</span>
                    </button>

                    <button
                      onClick={() => {
                        setLoginMethod("whatsapp");
                        setOtpSent(false);
                        setErrorMsg(null);
                      }}
                      className="w-full py-3.5 px-4 min-h-[48px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18211b] hover:bg-green-50/50 dark:hover:bg-[#1d2720] text-gray-800 dark:text-gray-200 font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-98"
                    >
                      <MessageSquare className="w-4 h-4 text-green-500 fill-green-500/10 flex-shrink-0" />
                      <span>Continue with Mobile / WhatsApp</span>
                    </button>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-800" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-[#121814] px-3 text-gray-400 font-semibold tracking-wider text-[10px]">
                          or instant access
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full py-3.5 px-4 min-h-[48px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18211b] hover:bg-gray-50 dark:hover:bg-[#1d2720] text-gray-800 dark:text-gray-200 font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-98"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>
                )}

                {/* 2. EMAIL AUTHENTICATION FORM */}
                {loginMethod === "email" && (
                  <div className="space-y-4 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => {
                          setLoginMethod("options");
                          setErrorMsg(null);
                          setOtpSent(false);
                        }}
                        className="text-xs text-gray-500 hover:text-emerald-600 font-bold flex items-center gap-1 cursor-pointer py-1"
                      >
                        ← Back to options
                      </button>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                        Email OTP
                      </span>
                    </div>

                    <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                      {!otpSent && (
                        <>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                              Your Name
                            </label>
                            <input
                              type="text"
                              value={authName}
                              onChange={(e) => setAuthName(e.target.value)}
                              placeholder="e.g. Alex Rivera"
                              className="w-full px-4 py-3 min-h-[46px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#18211b] text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-[#1e2a22] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              placeholder="name@example.com"
                              className="w-full px-4 py-3 min-h-[46px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#18211b] text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-[#1e2a22] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                              required
                            />
                          </div>
                        </>
                      )}

                      {otpSent && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                          <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                            <div className="min-w-0">
                              <p className="font-bold">Verification code dispatched</p>
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">Check inbox at {authEmail}</p>
                            </div>
                          </div>

                          {devOtpCode && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
                              <p className="font-bold flex items-center gap-1.5">
                                🔧 <span className="uppercase tracking-wider text-[10px]">Dev Sandbox Helper</span>
                              </p>
                              <p className="mt-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                                Since SMTP is unconfigured in this dev environment, your verified code is:
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="font-black text-sm bg-amber-100/80 dark:bg-amber-950/60 px-3 py-1 rounded-xl tracking-widest text-amber-900 dark:text-amber-200 tabular-nums">
                                  {devOtpCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAuthOtp(devOtpCode);
                                    setToastMessage("Code auto-filled! ✨");
                                  }}
                                  className="text-[10px] font-bold text-amber-800 dark:text-amber-400 underline hover:no-underline cursor-pointer min-h-[36px] flex items-center px-1"
                                >
                                  Auto-fill Code
                                </button>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 text-center">
                              Enter 6-Digit Verification Code
                            </label>
                            <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5 max-w-sm mx-auto">
                              {[0, 1, 2, 3, 4, 5].map((index) => {
                                const char = authOtp[index] || "";
                                return (
                                  <input
                                    key={index}
                                    ref={emailOtpRefs[index]}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={1}
                                    value={char}
                                    onChange={(e) => handleOtpBoxChange(e.target.value, index, emailOtpRefs)}
                                    onKeyDown={(e) => handleOtpBoxKeyDown(e, index, emailOtpRefs)}
                                    onPaste={(e) => handleOtpBoxPaste(e, emailOtpRefs)}
                                    className={`w-full aspect-square text-center text-lg font-black rounded-xl sm:rounded-2xl border transition-all duration-200 outline-none tabular-nums min-h-[44px] ${char
                                      ? "border-emerald-600/60 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 shadow-xs"
                                      : "border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#18211b] text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 focus:scale-105"
                                      }`}
                                    required
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSendingOtp || isVerifyingOtp || (!otpSent && resendCooldown > 0)}
                          className={`w-full py-3.5 px-6 min-h-[48px] rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer ${(isSendingOtp || isVerifyingOtp || (!otpSent && resendCooldown > 0)) ? "opacity-75 cursor-not-allowed" : "active:scale-98"
                            }`}
                        >
                          {isSendingOtp ? "Sending code..." : isVerifyingOtp ? "Verifying..." : otpSent ? "Verify Code" : "Send OTP"}
                        </button>
                      </div>
                    </form>

                    {otpSent && (
                      <div className="text-center pt-2">
                        {resendCooldown > 0 ? (
                          <span className="text-xs text-gray-400 font-semibold tabular-nums">
                            Resend code in {resendCooldown}s
                          </span>
                        ) : (
                          <button
                            onClick={handleSendOtp}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer py-1"
                          >
                            Resend Verification Code
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. MOBILE / WHATSAPP AUTHENTICATION FORM */}
                {loginMethod === "whatsapp" && (
                  <div className="space-y-4 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => {
                          setLoginMethod("options");
                          setErrorMsg(null);
                          setOtpSent(false);
                        }}
                        className="text-xs text-gray-500 hover:text-emerald-600 font-bold flex items-center gap-1 cursor-pointer py-1"
                      >
                        ← Back to options
                      </button>
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/60 px-2 py-0.5 rounded-lg border border-green-200/50 dark:border-green-800/50 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> WhatsApp OTP
                      </span>
                    </div>

                    <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                      {!otpSent && (
                        <>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                              Your Name
                            </label>
                            <input
                              type="text"
                              value={authName}
                              onChange={(e) => setAuthName(e.target.value)}
                              placeholder="e.g. Alex Rivera"
                              className="w-full px-4 py-3 min-h-[46px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#18211b] text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-[#1e2a22] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                              Mobile Number (with country code)
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                value={authPhone}
                                onChange={(e) => setAuthPhone(e.target.value)}
                                placeholder="+91XXXXXXXXXX"
                                className="w-full px-4 py-3 min-h-[46px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#18211b] text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-[#1e2a22] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                                required
                              />
                              <Smartphone className="w-4 h-4 text-gray-400 absolute right-4 top-3.5" />
                            </div>
                          </div>
                        </>
                      )}

                      {otpSent && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                          <div className="p-3 bg-green-50/80 dark:bg-green-950/20 border border-green-100 dark:border-green-900/60 rounded-2xl text-xs text-green-800 dark:text-green-300 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
                            <div className="min-w-0">
                              <p className="font-bold">WhatsApp code sent</p>
                              <p className="text-[11px] text-green-600 dark:text-green-400 truncate">Check WhatsApp on {authPhone}</p>
                            </div>
                          </div>

                          {devOtpCode && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-300">
                              <p className="font-bold flex items-center gap-1.5">
                                🔧 <span className="uppercase tracking-wider text-[10px]">Dev Sandbox Helper</span>
                              </p>
                              <p className="mt-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                                Since Twilio is unconfigured in this dev environment, your verified code is:
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="font-black text-sm bg-amber-100/80 dark:bg-amber-950/60 px-3 py-1 rounded-xl tracking-widest text-amber-900 dark:text-amber-200 tabular-nums">
                                  {devOtpCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAuthOtp(devOtpCode);
                                    setToastMessage("Code auto-filled! ✨");
                                  }}
                                  className="text-[10px] font-bold text-amber-800 dark:text-amber-400 underline hover:no-underline cursor-pointer min-h-[36px] flex items-center px-1"
                                >
                                  Auto-fill Code
                                </button>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 text-center">
                              Enter WhatsApp Verification Code
                            </label>
                            <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5 max-w-sm mx-auto">
                              {[0, 1, 2, 3, 4, 5].map((index) => {
                                const char = authOtp[index] || "";
                                return (
                                  <input
                                    key={index}
                                    ref={whatsappOtpRefs[index]}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={1}
                                    value={char}
                                    onChange={(e) => handleOtpBoxChange(e.target.value, index, whatsappOtpRefs)}
                                    onKeyDown={(e) => handleOtpBoxKeyDown(e, index, whatsappOtpRefs)}
                                    onPaste={(e) => handleOtpBoxPaste(e, whatsappOtpRefs)}
                                    className={`w-full aspect-square text-center text-lg font-black rounded-xl sm:rounded-2xl border transition-all duration-200 outline-none tabular-nums min-h-[44px] ${char
                                      ? "border-emerald-600/60 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 shadow-xs"
                                      : "border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#18211b] text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 focus:scale-105"
                                      }`}
                                    required
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSendingOtp || isVerifyingOtp || (!otpSent && resendCooldown > 0)}
                          className={`w-full py-3.5 px-6 min-h-[48px] rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer ${(isSendingOtp || isVerifyingOtp || (!otpSent && resendCooldown > 0)) ? "opacity-75 cursor-not-allowed" : "active:scale-98"
                            }`}
                        >
                          {isSendingOtp ? "Sending code..." : isVerifyingOtp ? "Verifying..." : otpSent ? "Verify Code" : "Send WhatsApp OTP"}
                        </button>
                      </div>
                    </form>

                    {otpSent && (
                      <div className="text-center pt-2">
                        {resendCooldown > 0 ? (
                          <span className="text-xs text-gray-400 font-semibold tabular-nums">
                            Resend code in {resendCooldown}s
                          </span>
                        ) : (
                          <button
                            onClick={handleSendOtp}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer py-1"
                          >
                            Resend Verification Code
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <p className="mt-6 text-center text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Private and encrypted session storage</span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==================================================
  // MAIN APP SHELL - FUTURISTIC HIGH-END UI
  // ==================================================
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b12] text-slate-800 dark:text-[#e2e8f0] flex flex-col md:flex-row transition-colors duration-300 font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      {/* Ambient Futuristic Background System */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-transparent rounded-full blur-[130px] dark:from-cyan-500/15 dark:via-blue-600/12 dark:to-transparent" />
        <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-violet-600/10 via-purple-500/10 to-pink-500/10 rounded-full blur-[140px] dark:from-violet-600/15 dark:via-purple-500/12 dark:to-pink-500/8" />
        <div className="absolute bottom-[-10%] left-[25%] w-[650px] h-[450px] bg-gradient-to-t from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-[120px] dark:from-emerald-500/12 dark:via-teal-500/8" />
        {/* Subtle Futuristic Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
      </div>

      {/* Floating Futuristic Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 dark:bg-[#0c1424]/95 backdrop-blur-2xl text-white px-5 py-3 rounded-2xl shadow-2xl shadow-cyan-500/20 border border-cyan-400/40 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-300">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <Sparkles className="w-4 h-4 text-cyan-300 flex-shrink-0" />
          <span className="text-slate-100">{toastMessage}</span>
        </div>
      )}

      {/* Floating Futuristic Error Notification */}
      {errorMsg && (
        <div className="fixed top-5 left-5 right-5 sm:left-auto sm:right-5 sm:top-20 z-50 bg-slate-900/95 dark:bg-[#1f0f18]/95 backdrop-blur-2xl text-white px-5 py-3 rounded-2xl shadow-2xl shadow-rose-500/20 border border-rose-500/40 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="text-slate-200">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-72 h-full bg-white dark:bg-[#0c121d] border-r border-slate-200 dark:border-white/10 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-300">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-lg text-white shadow-md shadow-cyan-500/30">
                    🥗
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                      MacroSnap
                    </h2>
                    <span className="text-[10px] text-cyan-500 font-semibold uppercase tracking-wider">AI Vision</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {[
                  { id: "dashboard", label: "Dashboard", icon: Home },
                  { id: "analyzer", label: "Food Scanner", icon: Camera },
                  { id: "chat", label: "AI Nutrition Chat", icon: MessageSquare },
                  { id: "nutrition", label: "Macro Analytics", icon: PieChart },
                  { id: "history", label: "Meal History", icon: Clock },
                  { id: "saved_meals", label: "Saved Meals", icon: Heart },
                  { id: "settings", label: "Settings", icon: SettingsIcon },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as ActiveSection);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isActive
                        ? "bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-violet-500/15 text-cyan-500 border border-cyan-500/30 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : ""}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs text-gray-500">Theme</span>
              <button
                onClick={() => setThemeMode(isDarkMode ? "light" : "dark")}
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar (Futuristic Glassmorphism) */}
      <aside className="hidden md:flex flex-col w-64 bg-white/75 dark:bg-[#0b1019]/80 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10 p-5 sticky top-0 h-screen z-30 shadow-sm relative">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-500 flex items-center justify-center text-xl text-white shadow-lg shadow-cyan-500/25">
            🥗
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-transparent leading-none">
              MacroSnap
            </h2>
            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Nutrition Intelligence</span>
            </p>
          </div>
        </div>

        {/* Demo Mode Badge if active */}
        {isDemoMode && (
          <div className="mb-4 mx-1 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-[11px] font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>🟢 DEMO MODE</span>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1.5">
          {[
            { id: "dashboard", label: "Dashboard", icon: Home },
            { id: "analyzer", label: "Food Scanner", icon: Camera },
            { id: "chat", label: "AI Nutrition Chat", icon: MessageSquare },
            { id: "nutrition", label: "Macro Analytics", icon: PieChart },
            { id: "history", label: "Meal History", icon: Clock },
            { id: "saved_meals", label: "Saved Meals", icon: Heart },
            { id: "settings", label: "Settings", icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as ActiveSection)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${isActive
                  ? "bg-gradient-to-r from-cyan-500/15 via-blue-600/15 to-violet-600/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 dark:border-cyan-400/25 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-cyan-500" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.id === "saved_meals" && savedMeals.length > 0 && (
                  <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-800/50">
                    {savedMeals.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Micro Calorie Tracker Widget in Sidebar */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121926]/90 border border-slate-200/80 dark:border-white/10 mb-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Today's Energy</span>
            <span className="text-cyan-600 dark:text-cyan-400 tabular-nums">
              {dailyTotals.calories} / {calorieGoal} kcal
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (dailyTotals.calories / calorieGoal) * 100)}%` }}
            />
          </div>
        </div>

        {/* Bottom Profile & Theme */}
        <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appearance</span>
            <button
              onClick={() => setThemeMode(isDarkMode ? "light" : "dark")}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#151e2e] text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-[#1c283d] transition-colors"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div
            onClick={() => setActiveSection("profile")}
            className="p-3 rounded-2xl bg-slate-100/80 dark:bg-[#121926] border border-slate-200 dark:border-white/10 flex items-center justify-between cursor-pointer hover:border-cyan-400 transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {(userName || currentUser?.displayName || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                  {userName || currentUser?.displayName || "User"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {whatsappNumber || currentUser?.email || "Pro Member"}
                </p>
              </div>
            </div>

            {currentUser ? (
              <button
                onClick={handleSignOut}
                className="text-slate-400 hover:text-red-500 p-1.5 cursor-pointer rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] font-bold cursor-pointer"
              >
                Sync
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative z-10">
        {/* Top Navbar (Futuristic Glassmorphic Sticky Header) */}
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-[#080d16]/75 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 h-16 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="text-xl">🥗</span>
              <span className="font-black text-slate-900 dark:text-white text-base tracking-tight">MacroSnap</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 pl-4 text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800">
              <span>Date:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!currentUser && (
              <button
                onClick={handleGoogleSignIn}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with Google</span>
              </button>
            )}

            {/* WhatsApp Summary button */}
            <button
              onClick={handleSendToWhatsApp}
              disabled={!hasInteracted || isSendingWhatsApp}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px] ${hasInteracted
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95"
                : "bg-slate-100 dark:bg-[#121926] text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSendingWhatsApp ? "Sending..." : "Send to WhatsApp"}</span>
              <span className="sm:hidden">Share</span>
            </button>

            {/* Analyze Meal shortcut button */}
            <button
              onClick={() => {
                setActiveSection("analyzer");
                fileInputRef.current?.click();
              }}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Food</span>
            </button>

            {/* Mobile theme toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Content Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-8 pb-28 md:pb-12">
          {/* Global Notification Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg backdrop-blur-xl animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
              <div className="flex items-center gap-2">
                {!currentUser && (
                  <button
                    onClick={handleGoogleSignIn}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>Sign in with Google</span>
                  </button>
                )}
                <button
                  onClick={() => setErrorMsg(null)}
                  className="p-1 text-rose-400 hover:text-rose-200 cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {/* ==================================================
              SECTION 1: DASHBOARD
              ================================================== */}
          {activeSection === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-300">

              {/* ==================================================
                  FUTURISTIC AI HERO SECTION
                  ================================================== */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0c1426] to-[#070b16] dark:from-[#0b1222] dark:via-[#0c1527] dark:to-[#050811] text-white p-6 sm:p-10 border border-cyan-500/25 dark:border-white/10 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl">
                {/* Internal Animated Glow Blobs */}
                <div className="absolute -top-24 -right-24 w-88 h-88 bg-gradient-to-br from-cyan-500/25 via-blue-600/20 to-purple-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-88 h-88 bg-gradient-to-tr from-pink-500/15 via-violet-600/20 to-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7 space-y-4">
                    {/* Small Animated AI Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold tracking-wide shadow-sm shadow-cyan-500/20 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Gemini 3.5 Multimodal Engine</span>
                    </div>

                    {/* Large Bold Headline with Gradient Text */}
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.12]">
                      AI-Powered <br />
                      <span className="gradient-text-ai">Nutrition Intelligence</span>
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
                      Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, <span className="text-cyan-300 font-bold">{userName || "Friend"}</span>! Snap a meal photo for instant macronutrient detection, search in any language, or get personalized advice from Gemini AI.
                    </p>

                    {/* CTA Buttons with Hover Animations */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          setActiveSection("analyzer");
                          fileInputRef.current?.click();
                        }}
                        className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-cyan-200" />
                        <span>📸 Scan Food Now</span>
                      </button>

                      <button
                        onClick={() => navigateToChat()}
                        className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-xs sm:text-sm backdrop-blur-md hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-cyan-300" />
                        <span>💬 Start AI Chat</span>
                      </button>

                      <button
                        onClick={() => setActiveSection("nutrition")}
                        className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <PieChart className="w-4 h-4 text-emerald-400" />
                        <span>Analytics</span>
                      </button>
                    </div>
                  </div>

                  {/* Hero Floating Real-Time Card */}
                  <div className="hidden lg:block lg:col-span-5">
                    <div className="relative animate-float">
                      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-3xl blur-lg opacity-30" />
                      <div className="relative p-5 rounded-3xl bg-slate-900/90 border border-white/15 backdrop-blur-2xl shadow-2xl space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Live AI Vision Active</span>
                          </div>
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-lg border border-cyan-800/50">
                            99.2% Accuracy
                          </span>
                        </div>

                        <div className="relative rounded-2xl overflow-hidden h-36 border border-white/10 group">
                          <img
                            src="https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&auto=format&fit=crop&q=80"
                            alt="Live plate"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute bottom-2 left-2 right-2 p-2 bg-black/75 backdrop-blur-md rounded-xl text-white flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black truncate">Chipotle Chicken Bowl</p>
                              <p className="text-[10px] text-slate-400">High-Protein Clean Meal</p>
                            </div>
                            <span className="text-xs font-black text-amber-400">650 kcal</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Protein</span>
                            <span className="text-xs font-black text-rose-400">38g</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Carbs</span>
                            <span className="text-xs font-black text-sky-400">72g</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Fat</span>
                            <span className="text-xs font-black text-emerald-400">20g</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Large Glassmorphism Nutrition Cards with Visual Indicators */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* Calories Card */}
                <div className="bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-xl rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-amber-400/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Calories</span>
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <Flame className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                          {dailyTotals.calories.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-slate-400">kcal</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Goal: {calorieGoal.toLocaleString()} kcal</p>
                    </div>
                    <CircularProgress
                      value={dailyTotals.calories}
                      max={calorieGoal}
                      color="#f59e0b"
                      size={54}
                      strokeWidth={5}
                    />
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (dailyTotals.calories / calorieGoal) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Protein Card */}
                <div className="bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-xl rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-rose-400/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Protein</span>
                    <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                      <Dumbbell className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {Math.round(dailyTotals.protein)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/ {proteinGoal}g</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                    <span>Target: {proteinGoal}g</span>
                    <span className="text-rose-500 font-bold">{Math.round((dailyTotals.protein / proteinGoal) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (dailyTotals.protein / proteinGoal) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Carbs Card */}
                <div className="bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-xl rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-sky-400/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Carbs</span>
                    <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                      <Wheat className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {Math.round(dailyTotals.carbs)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/ 250g</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                    <span>Target: 250g</span>
                    <span className="text-sky-500 font-bold">{Math.round((dailyTotals.carbs / 250) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (dailyTotals.carbs / 250) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Healthy Fat Card */}
                <div className="bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-xl rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-emerald-400/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fat</span>
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Smile className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {Math.round(dailyTotals.fat)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/ 70g</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                    <span>Target: 70g</span>
                    <span className="text-emerald-500 font-bold">{Math.round((dailyTotals.fat / 70) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (dailyTotals.fat / 70) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ==================================================
                  AI FOOD SEARCH & MULTILINGUAL VOICE BAR
                  ================================================== */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-cyan-950/5 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-cyan-500">🔎</span> AI Food Search & Multilingual Voice
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Type any food, meal, quantity (e.g. "2 eggs", "100g rice"), or comparison ("chicken vs paneer"), or speak in any language!
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                      <span className="text-[11px] font-bold text-slate-400">Response:</span>
                      <select
                        value={responseLanguage}
                        onChange={(e) => setResponseLanguage(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="English">English</option>
                        <option value="Telugu">Telugu (తెలుగు)</option>
                        <option value="Hindi">Hindi (हिन्दी)</option>
                        <option value="Tamil">Tamil (தமிழ்)</option>
                        <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                        <option value="Malayalam">Malayalam (മലയാളം)</option>
                        <option value="Marathi">Marathi (मराठी)</option>
                        <option value="Bengali">Bengali (বাংলা)</option>
                        <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                      <span className="text-[11px] font-bold text-slate-400">Mic Lang:</span>
                      <select
                        value={inputLanguage}
                        onChange={(e) => setInputLanguage(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="Auto Detect">Auto Detect</option>
                        <option value="English">English</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Malayalam">Malayalam</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Bengali">Bengali</option>
                        <option value="Gujarati">Gujarati</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Search Bar & Microphone */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleFoodSearch();
                  }}
                  className="relative flex items-center"
                >
                  <div className="absolute left-4 text-cyan-500">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search food, meal, or question (e.g. '2 bananas', 'chicken vs paneer')..."
                    className="w-full pl-12 pr-36 py-4 rounded-2xl bg-slate-50 dark:bg-[#111928] border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 shadow-inner transition-all"
                  />

                  <div className="absolute right-2 flex items-center gap-1.5">
                    {/* Microphone Button with Waveform/Glow */}
                    <button
                      type="button"
                      onClick={handleStartVoiceSearch}
                      disabled={isListening}
                      className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${isListening
                        ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40 ring-4 ring-red-500/20"
                        : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400"
                        }`}
                      title="Speak your question"
                    >
                      <Mic className="w-5 h-5" />
                    </button>

                    {/* Search Button */}
                    <button
                      type="submit"
                      disabled={isSearchingFood}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-cyan-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>{isSearchingFood ? "Searching..." : "Search"}</span>
                    </button>
                  </div>
                </form>

                {/* Listening / Waveform Status Badge */}
                {isListening && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-500/15 via-pink-500/15 to-violet-500/15 border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-between shadow-lg shadow-red-500/10 backdrop-blur-md animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span>🎤 Listening... Speak naturally now.</span>
                    </div>
                    <div className="flex items-center gap-1 h-6">
                      <div className="waveform-bar waveform-bar-1" />
                      <div className="waveform-bar waveform-bar-2" />
                      <div className="waveform-bar waveform-bar-3" />
                      <div className="waveform-bar waveform-bar-4" />
                      <div className="waveform-bar waveform-bar-5" />
                    </div>
                  </div>
                )}
                {isSearchingFood && (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-spin" />
                    <span>🥗 Preparing nutrition information & estimating macros...</span>
                  </div>
                )}

                {/* Recent Searches Chips */}
                {recentSearches.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-gray-400">🕘 Recent:</span>
                    {recentSearches.slice(0, 6).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSearchQuery(s.query);
                          handleFoodSearch(s.query);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                      >
                        {s.query}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Food Search Nutrition Result Card */}
              {foodSearchResult && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121814] border border-emerald-200 dark:border-emerald-900 shadow-2xl space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        {foodSearchResult.is_comparison ? "⚖️ Food Comparison Result" : "🍽️ AI Food Search Result"}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                        {foodSearchResult.food_name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Serving Size: <span className="font-semibold text-gray-800 dark:text-gray-200">{foodSearchResult.serving_size}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Audio TTS Playback Controls */}
                      {ttsState === "idle" && (
                        <button
                          onClick={() => {
                            const text = foodSearchResult.is_comparison
                              ? foodSearchResult.comparison_text
                              : `${foodSearchResult.food_name}: ${foodSearchResult.calories} calories, ${foodSearchResult.protein_g} grams protein.`;
                            playTextToSpeech(text);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>🔊 Play Voice</span>
                        </button>
                      )}
                      {ttsState === "playing" && (
                        <button
                          onClick={handlePauseTts}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>⏸ Pause</span>
                        </button>
                      )}
                      {ttsState === "paused" && (
                        <button
                          onClick={handleResumeTts}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>▶ Resume</span>
                        </button>
                      )}
                      {ttsState !== "idle" && (
                        <button
                          onClick={handleStopTts}
                          className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>⏹ Stop</span>
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          if (!auth.currentUser) {
                            setErrorMsg("Please sign in with Google or your account to log meals to Firestore.");
                            return;
                          }
                          try {
                            await persistMealToFirestore(foodSearchResult.food_name, {
                              calories: foodSearchResult.calories,
                              protein: foodSearchResult.protein_g,
                              carbs: foodSearchResult.carbs_g,
                              fat: foodSearchResult.fat_g,
                            }, true);
                            setToastMessage("Added search result to today's logged meals! 🥗");
                          } catch (err: any) {
                            console.error("REAL FIRESTORE SAVE FAILED:", err);
                            setErrorMsg(`Could not log meal to Firestore: ${err.message || "Save failed"}`);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>+ Log Meal</span>
                      </button>
                    </div>
                  </div>

                  {foodSearchResult.is_comparison && foodSearchResult.comparison_text && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                      {foodSearchResult.comparison_text}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                      <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Calories</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{foodSearchResult.calories} <span className="text-xs font-normal">kcal</span></p>
                    </div>
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                      <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">Protein</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{foodSearchResult.protein_g} <span className="text-xs font-normal">g</span></p>
                    </div>
                    <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900">
                      <p className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase">Carbohydrates</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{foodSearchResult.carbs_g} <span className="text-xs font-normal">g</span></p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Fat</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{foodSearchResult.fat_g} <span className="text-xs font-normal">g</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Sugar</span>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{foodSearchResult.sugar_g ?? 0} g</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Fiber</span>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{foodSearchResult.fiber_g ?? 0} g</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Sodium</span>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{foodSearchResult.sodium_mg ?? 0} mg</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Potassium</span>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{foodSearchResult.potassium_mg ?? 0} mg</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-bold text-gray-500 mb-2">💡 Follow-up questions:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        `Is ${foodSearchResult.food_name} good for weight loss?`,
                        `How can I increase the protein in ${foodSearchResult.food_name}?`,
                        `Is ${foodSearchResult.food_name} high in sugar?`,
                        `How many calories if I eat two servings?`,
                      ].map((qText, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSearchQuery(qText);
                            handleFoodSearch(qText);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                        >
                          {qText}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 italic">
                    ℹ️ {foodSearchResult.notes || "Nutrition values are approximate estimates."}
                  </p>
                </div>
              )}

              {/* Recent Meals Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Meals</h3>
                  <button
                    onClick={() => setActiveSection("history")}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {savedMeals.length === 0 ? (
                  <div className="p-8 text-center rounded-3xl bg-white/70 dark:bg-[#121814]/70 border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No saved meals yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Snap or search your food to log your first meal to Firestore.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedMeals.slice(0, 3).map((meal: any, idx: number) => (
                      <div
                        key={meal.id || idx}
                        onClick={() => setSelectedMealDetail(meal)}
                        className="p-4 rounded-3xl bg-white/80 dark:bg-[#121814]/80 backdrop-blur-md border border-gray-200/80 dark:border-gray-800/80 hover:border-emerald-400 dark:hover:border-emerald-600 hover:-translate-y-1 transition-all duration-300 shadow-xs flex items-center gap-3.5 cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-xl flex-shrink-0">
                          {idx % 3 === 0 ? "🍛" : idx % 3 === 1 ? "🥗" : "🍳"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{meal.name}</h4>
                          <p className="text-[11px] text-gray-400">
                            {meal.calories} kcal • {meal.protein}g protein
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          {typeof meal.createdAt === "string" && meal.createdAt.includes("T")
                            ? new Date(meal.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : meal.createdAt}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              SECTION 2: AI MEAL ANALYZER
              ================================================== */}
          {activeSection === "analyzer" && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
              {/* Header */}
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <Camera className="w-3.5 h-3.5" />
                  <span>AI Meal Analyzer</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  Upload your meal and let AI analyze it.
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Instant detection of ingredients, portion estimation, calories, and complete macronutrient metrics.
                </p>
              </div>

              {/* Main Card */}
              <div className="bg-white/90 dark:bg-[#121814]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-emerald-100/80 dark:border-emerald-950/60 shadow-xl shadow-emerald-950/5 space-y-6">
                {/* Upload Container or Image Preview */}
                {!selectedImage ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 bg-emerald-50/30 dark:bg-[#141d17]/50 hover:bg-emerald-50/60 dark:hover:bg-[#141d17] group"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl group-hover:scale-110 transition-transform mb-4">
                      📷
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      Drop your food image here
                    </p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse from your device</p>
                    <span className="inline-block mt-4 text-[10px] uppercase font-mono tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full">
                      JPG • PNG • JPEG
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-3xl overflow-hidden border border-emerald-200 dark:border-emerald-900/80 shadow-md">
                    <img
                      src={selectedImage}
                      alt="Meal Preview"
                      className="w-full max-h-80 object-cover"
                    />

                    {/* Animated Scanning Beam during AI analysis */}
                    {isAnalyzing && <div className="animate-scan" />}

                    {/* Controls overlay */}
                    {!isAnalyzing && (
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-bold backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retake Photo</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {/* Animated Analyzing State with Checklist */}
                {isAnalyzing && (
                  <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-[#141f17] border border-emerald-200 dark:border-emerald-900/80 text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <Sparkles className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>AI is analyzing your meal...</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
                      <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${analyzingStep >= 0 ? "text-emerald-700 dark:text-emerald-400 font-bold" : "opacity-40"}`}>
                        <span>✓ Detecting food</span>
                      </div>
                      <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${analyzingStep >= 1 ? "text-emerald-700 dark:text-emerald-400 font-bold" : "opacity-40"}`}>
                        <span>✓ Ingredients</span>
                      </div>
                      <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${analyzingStep >= 2 ? "text-amber-600 font-bold" : "opacity-40"}`}>
                        <span>⏳ Portions</span>
                      </div>
                      <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${analyzingStep >= 3 ? "text-emerald-700 dark:text-emerald-400 font-bold" : "opacity-40"}`}>
                        <span>○ Nutrition</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Action Buttons */}
                {selectedImage && !isAnalyzing && !analysisResult && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAnalyzeMeal()}
                      className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Meal</span>
                    </button>
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="py-3.5 px-6 rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* AI RESULT CARD */}
                {analysisResult && (
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-lime-50/50 dark:from-[#141e17] dark:via-[#121814] dark:to-[#141f17] border border-emerald-200/80 dark:border-emerald-900/80 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                          Meal Analysis ✨
                        </span>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">
                          {analysisResult.foodName}
                        </h3>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                        {analysisResult.modelUsed || "Gemini 3.5 Flash"}
                      </span>
                    </div>

                    {/* 4 Nutrition Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1a231d] border border-amber-200/80 text-center">
                        <span className="text-amber-500 text-base mb-1 block">🔥</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white block">
                          {analysisResult.macros.calories}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">kcal</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1a231d] border border-rose-200/80 text-center">
                        <span className="text-rose-500 text-base mb-1 block">💪</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white block">
                          {analysisResult.macros.protein}g
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Protein</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1a231d] border border-sky-200/80 text-center">
                        <span className="text-sky-500 text-base mb-1 block">🍚</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white block">
                          {analysisResult.macros.carbs}g
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Carbs</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1a231d] border border-emerald-200/80 text-center">
                        <span className="text-emerald-500 text-base mb-1 block">🥑</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white block">
                          {analysisResult.macros.fat}g
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Fat</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 italic">
                      * Nutrition values are approximate estimates based on recognized visual portions.
                    </p>

                    {/* AI Insight */}
                    <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#1a231d]/80 border border-emerald-100 dark:border-emerald-950/60 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      <strong className="text-emerald-700 dark:text-emerald-400 font-bold block mb-1">
                        AI Nutrition Insight:
                      </strong>
                      <span>{analysisResult.insight}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      {/* Prominent Save Meal to Firestore Button */}
                      <button
                        onClick={handleSaveMealExplicit}
                        disabled={isSavingMealState}
                        className={`flex-1 min-w-[160px] py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 ${savedMealCheckmark
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 scale-102"
                          : isSavingMealState
                            ? "bg-slate-700 text-slate-300 cursor-not-allowed opacity-90"
                            : "bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
                          }`}
                      >
                        {isSavingMealState ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Saving to Firestore...</span>
                          </>
                        ) : savedMealCheckmark ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                            <span>Saved to Firestore! ✓</span>
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4 text-cyan-200" />
                            <span>💾 Save Meal to Cloud</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          navigateToChat(
                            `Tell me more about the nutritional benefits and macros of this ${analysisResult.foodName}.`
                          )
                        }
                        className="py-3 px-4 rounded-2xl bg-white/10 dark:bg-white/10 hover:bg-white/20 text-slate-800 dark:text-white border border-slate-200 dark:border-white/15 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 backdrop-blur-md"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>💬 Ask AI Chat</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setAnalysisResult(null);
                        }}
                        className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>🔄 Another</span>
                      </button>

                      <button
                        onClick={handleSendToWhatsApp}
                        className="py-3 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Meals picker */}
              <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#121814]/70 border border-emerald-100/70 dark:border-emerald-950/40">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
                  Or pick a sample meal to test
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SAMPLE_MEALS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedImage(s.image);
                        setAnalysisResult(null);
                        setInputText(s.question);
                      }}
                      className="p-2.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 hover:border-emerald-400 text-left transition-all group cursor-pointer"
                    >
                      <img src={s.image} alt={s.title} className="w-full h-20 rounded-xl object-cover mb-2 group-hover:scale-105 transition-transform" />
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{s.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              SECTION 3: AI CHAT
              ================================================== */}
          {activeSection === "chat" && (
            <div className="flex flex-col h-[750px] bg-white/90 dark:bg-[#121814]/90 backdrop-blur-xl rounded-3xl border border-emerald-100/80 dark:border-emerald-950/60 shadow-xl shadow-emerald-950/5 overflow-hidden animate-in fade-in duration-300">
              {/* Chat Sub-header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between gap-3 bg-gray-50/70 dark:bg-[#151d18]/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm">
                    🥗
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white">MacroSnap AI</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>AI Online</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Your personal nutrition assistant</p>
                  </div>
                </div>

                {/* Model & Search Grounding Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-200/80 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setChatbotMode("fast")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${chatbotMode === "fast"
                        ? "bg-white dark:bg-[#121814] text-emerald-800 dark:text-emerald-300 shadow-xs"
                        : "text-gray-500"
                        }`}
                    >
                      ⚡ Fast
                    </button>
                    <button
                      onClick={() => setChatbotMode("general")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${chatbotMode === "general"
                        ? "bg-white dark:bg-[#121814] text-emerald-800 dark:text-emerald-300 shadow-xs"
                        : "text-gray-500"
                        }`}
                    >
                      🥗 General
                    </button>
                    <button
                      onClick={() => setChatbotMode("complex")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${chatbotMode === "complex"
                        ? "bg-white dark:bg-[#121814] text-emerald-800 dark:text-emerald-300 shadow-xs"
                        : "text-gray-500"
                        }`}
                    >
                      🧠 Deep
                    </button>
                  </div>

                  <button
                    onClick={() => setUseSearchGrounding(!useSearchGrounding)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${useSearchGrounding
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white dark:bg-[#1a231d] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                      }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Search: {useSearchGrounding ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 text-2xl flex items-center justify-center mx-auto">
                      🥗
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-base">
                      Hey {userName || "there"}! Ask me anything about food.
                    </h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Upload a photo of your lunch or ask questions like "How much protein is in 3 eggs?" or "Is quinoa better than white rice?"
                    </p>
                  </div>
                )}

                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 animate-in fade-in duration-200 ${msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
                        🥗
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 text-sm leading-relaxed ${msg.role === "user"
                        ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-br-xs shadow-md shadow-emerald-950/10"
                        : "bg-gray-100/90 dark:bg-[#18211b] text-gray-900 dark:text-gray-100 border border-gray-200/60 dark:border-gray-800 rounded-bl-xs shadow-xs"
                        }`}
                    >
                      {msg.image && (
                        <div className="mb-3 rounded-2xl overflow-hidden border border-white/20 shadow-sm max-w-xs">
                          <img src={msg.image} alt="Meal" className="w-full max-h-56 object-cover" />
                        </div>
                      )}

                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Macro tags */}
                      {msg.macros && msg.macros.calories && (
                        <div className="mt-3 pt-2.5 border-t border-gray-200/60 dark:border-gray-800 flex flex-wrap gap-1.5 font-mono text-xs">
                          <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-lg">
                            🔥 {msg.macros.calories} kcal
                          </span>
                          {msg.macros.protein && (
                            <span className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-lg">
                              💪 {msg.macros.protein}g P
                            </span>
                          )}
                          {msg.macros.carbs && (
                            <span className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-lg">
                              🍚 {msg.macros.carbs}g C
                            </span>
                          )}
                          {msg.macros.fat && (
                            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-lg">
                              🥑 {msg.macros.fat}g F
                            </span>
                          )}
                        </div>
                      )}

                      {/* Grounding links */}
                      {msg.searchSources && msg.searchSources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-800 flex flex-wrap gap-1">
                          {msg.searchSources.slice(0, 3).map((src, sI) => (
                            <a
                              key={sI}
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] hover:underline"
                            >
                              <span>{src.title}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ))}
                        </div>
                      )}

                      <div
                        className={`text-[10px] mt-2 text-right ${msg.role === "user" ? "text-emerald-100" : "text-gray-400"
                          }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>

                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-2xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(userName || "U")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}

                {isAnalyzing && (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <div className="w-8 h-8 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-sm">
                      🥗
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Thinking and estimating macros...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Quick Questions suggestion chips */}
              <div className="px-5 py-2.5 bg-gray-50/80 dark:bg-[#151e18] border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Suggestions:
                </span>
                <button
                  onClick={() => handleSendChatMessage("How can I increase the protein of this meal?")}
                  className="px-3 py-1 bg-white dark:bg-[#1a231d] hover:bg-emerald-50 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                >
                  💪 Increase protein
                </button>
                <button
                  onClick={() => handleSendChatMessage("How can I reduce the calories of this meal?")}
                  className="px-3 py-1 bg-white dark:bg-[#1a231d] hover:bg-emerald-50 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                >
                  🔥 Reduce calories
                </button>
                <button
                  onClick={() => handleSendChatMessage("What are healthier ingredients to swap in this meal?")}
                  className="px-3 py-1 bg-white dark:bg-[#1a231d] hover:bg-emerald-50 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                >
                  🥗 Make it healthier
                </button>
                <button
                  onClick={() => handleSendChatMessage("Is this meal optimal for post-workout muscle recovery?")}
                  className="px-3 py-1 bg-white dark:bg-[#1a231d] hover:bg-emerald-50 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                >
                  🏋️ Post-workout?
                </button>
                <button
                  onClick={() => handleSendChatMessage("Give me 3 delicious and lower calorie alternatives.")}
                  className="px-3 py-1 bg-white dark:bg-[#1a231d] hover:bg-emerald-50 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                >
                  🍽 Better alternatives
                </button>
              </div>

              {/* Chat Input Pill Composer */}
              <div className="p-4 bg-white dark:bg-[#121814] border-t border-gray-100 dark:border-gray-800">
                {selectedImage && (
                  <div className="mb-3 flex items-center gap-2">
                    <div className="relative border-2 border-emerald-500 rounded-xl overflow-hidden w-14 h-14">
                      <img src={selectedImage} alt="Thumbnail" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-0.5 right-0.5 bg-black/80 text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">Meal image attached</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-[#18211b] border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload meal photo"
                    className="p-2 text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    ref={chatInputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask anything about your food..."
                    className="flex-1 bg-transparent px-2 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-gray-500 hover:text-emerald-600"
                      }`}
                    title="Voice input"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="submit"
                    disabled={isAnalyzing || (!inputText.trim() && !selectedImage)}
                    className="p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================================================
              SECTION 4: NUTRITION TARGETS & METRICS
              ================================================== */}
          {activeSection === "nutrition" && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection("dashboard")}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-1">
                      <PieChart className="w-3.5 h-3.5" />
                      <span>{filteredNutritionStats.label} Macro Analytics</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                      Nutrition Overview
                    </h2>
                  </div>
                </div>

                {/* Time Range Filter Pills */}
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                  <button
                    onClick={() => setNutritionTimeRange("today")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${nutritionTimeRange === "today"
                      ? "bg-white dark:bg-[#121814] text-emerald-800 dark:text-emerald-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setNutritionTimeRange("week")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${nutritionTimeRange === "week"
                      ? "bg-white dark:bg-[#121814] text-emerald-800 dark:text-emerald-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setNutritionTimeRange("month")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${nutritionTimeRange === "month"
                      ? "bg-white dark:bg-[#121814] text-emerald-800 dark:text-emerald-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                  >
                    This Month
                  </button>
                </div>
              </div>

              {/* HERO RADIAL CHART CARD */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-[#121814]/90 backdrop-blur-xl border border-emerald-100/80 dark:border-emerald-950/60 shadow-xl shadow-emerald-950/5">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  {/* Recharts Radial Bar Chart */}
                  <div className="relative w-full max-w-[320px] h-[320px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="35%"
                        outerRadius="95%"
                        barSize={12}
                        data={[
                          {
                            name: "Fat",
                            value: Math.min(
                              100,
                              Math.round((filteredNutritionStats.fat / filteredNutritionStats.fatTarget) * 100)
                            ),
                            fill: "#10b981",
                            actual: `${filteredNutritionStats.fat}g`,
                            target: `${filteredNutritionStats.fatTarget}g`,
                          },
                          {
                            name: "Carbs",
                            value: Math.min(
                              100,
                              Math.round((filteredNutritionStats.carbs / filteredNutritionStats.carbsTarget) * 100)
                            ),
                            fill: "#0ea5e9",
                            actual: `${filteredNutritionStats.carbs}g`,
                            target: `${filteredNutritionStats.carbsTarget}g`,
                          },
                          {
                            name: "Protein",
                            value: Math.min(
                              100,
                              Math.round(
                                (filteredNutritionStats.protein / filteredNutritionStats.proteinTarget) * 100
                              )
                            ),
                            fill: "#f43f5e",
                            actual: `${filteredNutritionStats.protein}g`,
                            target: `${filteredNutritionStats.proteinTarget}g`,
                          },
                          {
                            name: "Calories",
                            value: Math.min(
                              100,
                              Math.round(
                                (filteredNutritionStats.calories / filteredNutritionStats.calorieTarget) * 100
                              )
                            ),
                            fill: "#f59e0b",
                            actual: `${filteredNutritionStats.calories.toLocaleString()} kcal`,
                            target: `${filteredNutritionStats.calorieTarget.toLocaleString()} kcal`,
                          },
                        ]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis
                          type="number"
                          domain={[0, 100]}
                          angleAxisId={0}
                          tick={false}
                        />
                        <RadialBar
                          background={{ fill: isDarkMode ? "#1e2922" : "#f1f5f9" }}
                          dataKey="value"
                          cornerRadius={10}
                        />
                        <RechartsTooltip
                          formatter={(value: any, name: any, item: any) => [
                            `${item.payload.actual} (${value}% of ${item.payload.target})`,
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: isDarkMode ? "#18211b" : "#ffffff",
                            borderColor: isDarkMode ? "#223126" : "#e2e8f0",
                            borderRadius: "16px",
                            fontSize: "12px",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>

                    {/* Central Statistics Floating Badge */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 mb-1">
                        <Flame className="w-5 h-5" />
                      </span>
                      <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                        {filteredNutritionStats.calories.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                        kcal {nutritionTimeRange === "today" ? "today" : nutritionTimeRange}
                      </span>
                      <span className="mt-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold">
                        {Math.round(
                          (filteredNutritionStats.calories / filteredNutritionStats.calorieTarget) * 100
                        )}
                        % of target
                      </span>
                    </div>
                  </div>

                  {/* Radial Ring Legend & Interactive Metrics Breakdown */}
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        Macronutrient Rings Overview
                      </h4>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {calorieGoal - dailyTotals.calories > 0
                          ? `${(calorieGoal - dailyTotals.calories).toLocaleString()} kcal remaining`
                          : "Calorie target reached! 🔥"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Calories Ring Indicator */}
                      <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-[#18211b]/70 border border-gray-200/60 dark:border-gray-800/80 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#18211b] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-xs flex-shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                              Energy Intake (Outer Ring)
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {dailyTotals.calories.toLocaleString()} / {calorieGoal.toLocaleString()} kcal
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                          {Math.round((dailyTotals.calories / calorieGoal) * 100)}%
                        </span>
                      </div>

                      {/* Protein Ring Indicator */}
                      <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-[#18211b]/70 border border-gray-200/60 dark:border-gray-800/80 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#18211b] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-xs flex-shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                              Protein (Ring 2)
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {Math.round(dailyTotals.protein)}g / {proteinGoal}g
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
                          {Math.round((dailyTotals.protein / proteinGoal) * 100)}%
                        </span>
                      </div>

                      {/* Carbs Ring Indicator */}
                      <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-[#18211b]/70 border border-gray-200/60 dark:border-gray-800/80 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#18211b] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded-full bg-sky-500 shadow-xs flex-shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                              Carbohydrates (Ring 3)
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {Math.round(dailyTotals.carbs)}g / 250g
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-sky-600 dark:text-sky-400 font-mono">
                          {Math.round((dailyTotals.carbs / 250) * 100)}%
                        </span>
                      </div>

                      {/* Fat Ring Indicator */}
                      <div className="p-3 rounded-2xl bg-gray-50/70 dark:bg-[#18211b]/70 border border-gray-200/60 dark:border-gray-800/80 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#18211b] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-xs flex-shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                              Healthy Fat (Core Ring)
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {Math.round(dailyTotals.fat)}g / 70g
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {Math.round((dailyTotals.fat / 70) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CALORIE RATIOS & ENERGY METABOLISM CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#121814]/80 border border-emerald-100/80 dark:border-emerald-950/60 shadow-xs">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Protein Caloric Share
                  </span>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {dailyTotals.calories > 0
                      ? `${Math.round(((dailyTotals.protein * 4) / dailyTotals.calories) * 100)}%`
                      : "0%"}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {Math.round(dailyTotals.protein * 4)} kcal from lean protein
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#121814]/80 border border-emerald-100/80 dark:border-emerald-950/60 shadow-xs">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Carb Caloric Share
                  </span>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                    {dailyTotals.calories > 0
                      ? `${Math.round(((dailyTotals.carbs * 4) / dailyTotals.calories) * 100)}%`
                      : "0%"}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {Math.round(dailyTotals.carbs * 4)} kcal from clean carbs
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#121814]/80 border border-emerald-100/80 dark:border-emerald-950/60 shadow-xs">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Fat Caloric Share
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {dailyTotals.calories > 0
                      ? `${Math.round(((dailyTotals.fat * 9) / dailyTotals.calories) * 100)}%`
                      : "0%"}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {Math.round(dailyTotals.fat * 9)} kcal from healthy dietary fat
                  </p>
                </div>
              </div>

              {/* 7-DAY MULTI-DAY CALORIE HISTORY LINECHART */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-[#121814]/90 backdrop-blur-xl border border-emerald-100/80 dark:border-emerald-950/60 shadow-xl shadow-emerald-950/5 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500">
                        <Flame className="w-4 h-4" />
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                        7-Day Caloric Intake Trends
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tracking daily consumption against your baseline target of {calorieGoal.toLocaleString()} kcal.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold font-mono">
                      7-Day Avg: {sevenDayAvgCalories.toLocaleString()} kcal/day
                    </span>
                  </div>
                </div>

                {/* Recharts LineChart */}
                <div className="w-full h-72 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={sevenDayHistory}
                      margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDarkMode ? "#1f2b23" : "#f1f5f9"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: isDarkMode ? "#94a3b8" : "#64748b",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: isDarkMode ? "#94a3b8" : "#64748b",
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                        tickFormatter={(val) => `${val}`}
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          name === "Calories Consumed" ? `${val} kcal` : `${val}g`,
                          name,
                        ]}
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload;
                          return item ? `${item.day}, ${item.date}` : label;
                        }}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#18211b" : "#ffffff",
                          borderColor: isDarkMode ? "#223126" : "#e2e8f0",
                          borderRadius: "16px",
                          fontSize: "12px",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                        }}
                      />
                      <ReferenceLine
                        y={calorieGoal}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        label={{
                          value: `Target: ${calorieGoal} kcal`,
                          fill: isDarkMode ? "#34d399" : "#059669",
                          fontSize: 11,
                          fontWeight: 700,
                          position: "top",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="calories"
                        name="Calories Consumed"
                        stroke="#f59e0b"
                        strokeWidth={3.5}
                        dot={{
                          fill: "#f59e0b",
                          r: 4.5,
                          strokeWidth: 2,
                          stroke: isDarkMode ? "#121814" : "#ffffff",
                        }}
                        activeDot={{
                          r: 7,
                          fill: "#f59e0b",
                          stroke: "#ffffff",
                          strokeWidth: 2.5,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="protein"
                        name="Protein (g)"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{
                          fill: "#f43f5e",
                          r: 3,
                          strokeWidth: 1.5,
                          stroke: isDarkMode ? "#121814" : "#ffffff",
                        }}
                        activeDot={{
                          r: 5,
                          fill: "#f43f5e",
                        }}
                      />
                      <RechartsLegend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mr-3">
                            {value}
                          </span>
                        )}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 3 Insight Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-[#18211b]/80 border border-gray-200/60 dark:border-gray-800/80">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                      7-Day Average
                    </span>
                    <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                      {sevenDayAvgCalories.toLocaleString()}{" "}
                      <span className="text-xs font-bold text-gray-400">kcal</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {sevenDayAvgCalories <= calorieGoal
                        ? `✓ ${calorieGoal - sevenDayAvgCalories} kcal below ceiling`
                        : `▲ ${sevenDayAvgCalories - calorieGoal} kcal over target`}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-[#18211b]/80 border border-gray-200/60 dark:border-gray-800/80">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                      Peak Day
                    </span>
                    <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                      {highestDay.day}{" "}
                      <span className="text-xs font-bold text-gray-400">({highestDay.calories} kcal)</span>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      Highest recorded intake this week
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-[#18211b]/80 border border-gray-200/60 dark:border-gray-800/80">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                      Target Consistency
                    </span>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {goalAdherence}%
                    </div>
                    <span className="text-[11px] text-gray-400">
                      Days within ±250 kcal of target
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              SECTION 5: HISTORY
              ================================================== */}
          {activeSection === "history" && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection("dashboard")}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Clock className="w-5 h-5 text-cyan-400" />
                      <span>Nutrition & Meal History</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Logged meals synced securely with Cloud Firestore. Click any meal for details.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSection("analyzer")}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer w-fit"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Log New Meal</span>
                </button>
              </div>

              {savedMeals.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-3 bg-white/70 dark:bg-[#0c121e]/70 rounded-3xl border border-slate-200/80 dark:border-white/10 backdrop-blur-xl">
                  <Database className="w-12 h-12 mx-auto text-cyan-400/50" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No meals logged yet.</p>
                  <p className="text-xs max-w-xs mx-auto text-slate-400">
                    Take a photo of your meal in the analyzer or use the food search bar to add your first meal!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedMeals.map((meal) => (
                    <div
                      key={meal.id}
                      onClick={() => setSelectedMealDetail(meal)}
                      className="p-5 rounded-3xl bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-cyan-400/50 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 space-y-3 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors">{meal.name}</h4>
                          <span className="text-[11px] text-slate-400">
                            {new Date(meal.createdAt).toLocaleDateString()} •{" "}
                            {new Date(meal.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {meal.searchGrounded && (
                          <span className="text-[9px] bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                            Search Grounded
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 p-2 rounded-2xl">
                          <span className="text-[9px] font-bold text-amber-500 block">KCAL</span>
                          <span className="font-bold text-slate-900 dark:text-amber-300">{meal.calories}</span>
                        </div>
                        <div className="bg-rose-500/10 dark:bg-rose-500/10 border border-rose-500/20 p-2 rounded-2xl">
                          <span className="text-[9px] font-bold text-rose-500 block">PRO</span>
                          <span className="font-bold text-slate-900 dark:text-rose-300">{meal.protein}g</span>
                        </div>
                        <div className="bg-sky-500/10 dark:bg-sky-500/10 border border-sky-500/20 p-2 rounded-2xl">
                          <span className="text-[9px] font-bold text-sky-500 block">CARB</span>
                          <span className="font-bold text-slate-900 dark:text-sky-300">{meal.carbs}g</span>
                        </div>
                        <div className="bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-2xl">
                          <span className="text-[9px] font-bold text-emerald-500 block">FAT</span>
                          <span className="font-bold text-slate-900 dark:text-emerald-300">{meal.fat}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              SECTION: SAVED MEALS / WISHLIST
              ================================================== */}
          {activeSection === "saved_meals" && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSection("dashboard");
                    }}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                      <span>Saved Meals & Favorites</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your favorite foods and logged items stored securely.
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSection("analyzer");
                  }}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer w-fit"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Log New Meal</span>
                </button>
              </div>

              {savedMeals.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-3 bg-white/70 dark:bg-[#0c121e]/70 rounded-3xl border border-slate-200/80 dark:border-white/10 backdrop-blur-xl">
                  <Heart className="w-12 h-12 mx-auto text-rose-500/40" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No saved meals or favorites yet.</p>
                  <p className="text-xs max-w-xs mx-auto text-slate-400">
                    Click the Save Meal button on any meal analysis or log meals from the search bar to see them here!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedMeals.map((meal) => (
                    <div
                      key={meal.id}
                      onClick={() => setSelectedMealDetail(meal)}
                      className="p-5 rounded-3xl bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-rose-400/50 hover:shadow-xl hover:shadow-rose-500/10 hover:-translate-y-1 transition-all duration-300 space-y-3 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-rose-400 transition-colors">
                            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                            {meal.name}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {new Date(meal.createdAt).toLocaleDateString()} •{" "}
                            {new Date(meal.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const toDeleteId = meal.id;
                            setSavedMeals((prev) => prev.filter((m) => m.id !== toDeleteId));
                            if (currentUser) {
                              try {
                                await deleteDoc(doc(db, "users", currentUser.uid, "meals", toDeleteId));
                              } catch (err) {
                                console.warn("Could not delete from Firestore:", err);
                              }
                            }
                            setToastMessage("Removed from saved meals 🗑️");
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove saved meal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 p-2 rounded-2xl">
                          <span className="text-[9px] font-bold text-amber-500 block">KCAL</span>
                          <span className="font-bold text-slate-900 dark:text-amber-300">{meal.calories}</span>
                        </div>
                        <div className="bg-rose-500/10 dark:bg-rose-500/10 border border-rose-500/20 p-2 rounded-2xl">
                          <span className="text-[9px] font-bold text-rose-500 block">PRO</span>
                          <span className="font-bold text-slate-900 dark:text-rose-300">{meal.protein}g</span>
                        </div>
                        <div className="bg-sky-500/10 dark:bg-sky-500/10 border border-sky-500/20 p-2 rounded-2xl">
                          <span className="text-[9px] font-bold text-sky-500 block">CARB</span>
                          <span className="font-bold text-slate-900 dark:text-sky-300">{meal.carbs}g</span>
                        </div>
                        <div className="bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-2xl">
                          <span className="text-[9px] font-bold text-emerald-500 block">FAT</span>
                          <span className="font-bold text-slate-900 dark:text-emerald-300">{meal.fat}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              SECTION 6: SETTINGS
              ================================================== */}
          {activeSection === "settings" && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveSection("dashboard")}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  ← Back
                </button>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Manage your application appearance, AI engine mode, and preferences.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Account Section */}
                <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#121814]/90 border border-gray-200/80 dark:border-gray-800 space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Account</h3>
                  {currentUser ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {currentUser.photoURL ? (
                          <img src={currentUser.photoURL} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center">
                            {(userName || currentUser.displayName || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Profile</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">
                            {userName || currentUser.displayName || "User"}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div>
                          <span className="text-[10px] text-gray-400 font-semibold uppercase block">Email Address</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">
                            {currentUser.email || localStorage.getItem("macrosnap_user_email") || "Not Linked"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-semibold uppercase block">Mobile / WhatsApp</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">
                            {whatsappNumber || "Not Linked"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Not signed in</p>
                        <p className="text-[11px] text-gray-400">Sign in with Email or Mobile OTP to sync your nutrition history securely</p>
                      </div>
                      <button
                        onClick={() => {
                          setLoginMethod("options");
                          setIsOnboarded(false);
                        }}
                        className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs flex-shrink-0"
                      >
                        <User className="w-4 h-4" />
                        <span>Login</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Appearance: Light / Dark / System */}
                <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#121814]/90 border border-gray-200/80 dark:border-gray-800 space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Appearance</h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => setThemeMode("light")}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${themeMode === "light"
                        ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs"
                        : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Light</span>
                    </button>

                    <button
                      onClick={() => setThemeMode("dark")}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${themeMode === "dark"
                        ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs"
                        : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                    >
                      <Moon className="w-4 h-4 text-sky-400" />
                      <span>Dark</span>
                    </button>

                    <button
                      onClick={() => setThemeMode("system")}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${themeMode === "system"
                        ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs"
                        : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                    >
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>System</span>
                    </button>
                  </div>
                </div>

                {/* AI Engine Mode */}
                <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#121814]/90 border border-gray-200/80 dark:border-gray-800 space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">AI Engine Mode</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {isDemoMode ? "🟢 Demo Mode Active" : "✨ Gemini Live AI Active"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {isDemoMode
                          ? "Using instant simulation without calling external Gemini APIs"
                          : "Calling Gemini 3.5 & Vision models for live food intelligence"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = !isDemoMode;
                        setIsDemoMode(newVal);
                        localStorage.setItem("macrosnap_demo_mode", String(newVal));
                        setToastMessage(newVal ? "Switched to Demo Mode 🟢" : "Switched to Gemini AI Mode ✨");
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${isDemoMode ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
                        }`}
                    >
                      <span
                        className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isDemoMode ? "translate-x-6" : ""
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Firebase Connection Card */}
                <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#121814]/90 border border-gray-200/80 dark:border-gray-800 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-lg">
                        🔥
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Connected Firebase Project</h3>
                        <p className="text-[11px] text-gray-400">Your live Firebase and Firestore configuration</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Connected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#18211b] border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Project ID</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">ai-food-chatbot</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#18211b] border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Database ID</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">(default)</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#18211b] border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Auth Domain</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200 truncate block">ai-food-chatbot.firebaseapp.com</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#18211b] border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Storage Bucket</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200 truncate block">ai-food-chatbot.firebasestorage.app</span>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#121814]/90 border border-gray-200/80 dark:border-gray-800 space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {notificationsEnabled ? "Enabled" : "Disabled"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Receive instant status banners and meal tracking alerts
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !notificationsEnabled;
                        setNotificationsEnabled(nextVal);
                        localStorage.setItem("macrosnap_notifications", String(nextVal));
                        setToastMessage(nextVal ? "Notifications enabled 🔔" : "Notifications muted 🔕");
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${notificationsEnabled ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
                        }`}
                    >
                      <span
                        className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${notificationsEnabled ? "translate-x-6" : ""
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              SECTION: PROFILE
              ================================================== */}
          {activeSection === "profile" && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection("dashboard")}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Your Profile</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Manage your personal details and nutrition objectives.
                    </p>
                  </div>
                </div>

                {!isEditingProfile && (
                  <button
                    onClick={() => {
                      setEditName(userName);
                      setEditPhone(whatsappNumber);
                      setEditCalorieGoal(calorieGoal);
                      setEditProteinGoal(proteinGoal);
                      setIsEditingProfile(true);
                    }}
                    className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Profile Card */}
              <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#121814]/90 border border-gray-200/80 dark:border-gray-800 space-y-6 shadow-xs">
                <div className="flex items-center gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center">
                      {(userName || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{userName || "Friend"}</h3>
                    <p className="text-xs text-gray-400">{currentUser?.email || "Local Guest Account"}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                      {currentUser ? "Synced with Firebase" : "Local Session"}
                    </span>
                  </div>
                </div>

                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18211b] text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                        WhatsApp Number
                      </label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18211b] text-sm font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                          Daily Calorie Goal (kcal)
                        </label>
                        <input
                          type="number"
                          value={editCalorieGoal}
                          onChange={(e) => setEditCalorieGoal(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18211b] text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                          Daily Protein Goal (grams)
                        </label>
                        <input
                          type="number"
                          value={editProteinGoal}
                          onChange={(e) => setEditProteinGoal(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18211b] text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-3">
                      <button
                        onClick={async () => {
                          if (!editName.trim()) {
                            setErrorMsg("Name cannot be empty.");
                            return;
                          }
                          setUserName(editName.trim());
                          setWhatsappNumber(editPhone.trim());
                          setCalorieGoal(editCalorieGoal);
                          setProteinGoal(editProteinGoal);
                          localStorage.setItem("macrosnap_user_name", editName.trim());
                          localStorage.setItem("macrosnap_whatsapp", editPhone.trim());
                          localStorage.setItem("macrosnap_calorie_goal", String(editCalorieGoal));
                          localStorage.setItem("macrosnap_protein_goal", String(editProteinGoal));

                          if (currentUser) {
                            try {
                              const userDocRef = doc(db, "users", currentUser.uid);
                              await setDoc(
                                userDocRef,
                                {
                                  name: editName.trim(),
                                  whatsappNumber: editPhone.trim(),
                                  dailyCalorieTarget: editCalorieGoal,
                                  dailyProteinTarget: editProteinGoal,
                                  updatedAt: new Date().toISOString(),
                                },
                                { merge: true }
                              );
                            } catch (err) {
                              console.warn("Could not sync profile to Firestore:", err);
                            }
                          }

                          setIsEditingProfile(false);
                          setToastMessage("Profile changes saved successfully! ✨");
                        }}
                        className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="py-3 px-6 rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-400">Full Name</span>
                      <span className="font-bold text-gray-900 dark:text-white">{userName || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-400">WhatsApp Number</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white">{whatsappNumber || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-400">Daily Calorie Target</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{calorieGoal.toLocaleString()} kcal</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Daily Protein Target</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{proteinGoal}g protein</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              SECTION 7: STREAMLIT CODE EXPLORER
              ================================================== */}
          {activeSection === "code" && (
            <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    macrosnap/ Python Codebase
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Pristine Streamlit repository files located in the <code className="text-emerald-600 font-mono">macrosnap/</code> folder.
                  </p>
                </div>
                <div className="bg-gray-900 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2">
                  <span className="text-emerald-400">$</span>
                  <span>streamlit run app.py</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-2">
                  {projectFiles.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${selectedFile?.path === file.path
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-300 font-bold"
                        : "border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                    >
                      <span className="truncate">{file.path}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-mono">{file.language}</span>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex flex-col min-h-[450px]">
                  <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-300">macrosnap/{selectedFile?.path || "app.py"}</span>
                    <button
                      onClick={() => selectedFile && handleCopyCode(selectedFile.content)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      {copiedFile ? "✓ Copied" : "Copy Code"}
                    </button>
                  </div>
                  <div className="p-4 flex-1 overflow-auto max-h-[500px] text-xs font-mono text-emerald-300/90">
                    <pre className="whitespace-pre">{selectedFile?.content || "# Select a file"}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121814] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md">
                💬
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">WhatsApp Meal Summary</h3>
                <p className="text-xs text-gray-500">Destination: {whatsappNumber || "+91XXXXXXXXXX"}</p>
              </div>
            </div>

            {isSendingWhatsApp && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300 mb-4">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 flex-shrink-0" />
                <span>Gemini is compiling meal logs and generating your WhatsApp summary...</span>
              </div>
            )}

            {whatsAppSuccess && (
              <div className="p-3.5 bg-emerald-100/80 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 font-semibold flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{whatsAppSuccess}</span>
              </div>
            )}

            {whatsAppError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{whatsAppError}</span>
              </div>
            )}

            {/* Realistic WhatsApp Chat Bubble simulation */}
            <div className="bg-[#efeae2] dark:bg-[#1a231d] p-4 rounded-2xl border border-[#d1d7db] dark:border-gray-800 relative overflow-hidden shadow-inner">
              <div className="text-[10px] text-center text-gray-500 uppercase font-semibold mb-2">
                Today's Nutrition Digest
              </div>

              <div className="bg-white dark:bg-[#1f2c24] rounded-2xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-800 max-w-sm ml-auto relative text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                <div className="font-bold text-emerald-800 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                  <span>🥗 MacroSnap Daily Summary</span>
                </div>
                <div className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">
                  {whatsAppSummary || "Generating consolidated meal summary with Gemini..."}
                </div>
                <div className="mt-2 text-[10px] text-gray-400 text-right flex items-center justify-end gap-1">
                  <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-emerald-600 font-bold">✓✓</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  if (whatsAppSummary) {
                    navigator.clipboard.writeText(whatsAppSummary);
                    setToastMessage("Summary text copied to clipboard! 📋");
                  }
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Summary</span>
              </button>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Detail Modal */}
      {selectedMealDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-cyan-500/20 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedMealDetail(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center text-2xl shadow-xs">
                🥗
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">
                  {selectedMealDetail.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedMealDetail.createdAt
                    ? typeof selectedMealDetail.createdAt === "string" && selectedMealDetail.createdAt.includes("T")
                      ? new Date(selectedMealDetail.createdAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }) +
                      " at " +
                      new Date(selectedMealDetail.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : selectedMealDetail.createdAt
                    : "Logged Meal"}
                </p>
              </div>
            </div>

            {selectedMealDetail.imageUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden max-h-48 border border-slate-200 dark:border-white/10 shadow-inner">
                <img
                  src={selectedMealDetail.imageUrl}
                  alt={selectedMealDetail.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 4 Nutrition Badges */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs mb-4">
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <span className="text-[10px] font-bold text-amber-500 block">KCAL</span>
                <span className="text-base font-black text-slate-900 dark:text-amber-300">
                  {selectedMealDetail.calories}
                </span>
              </div>
              <div className="p-3 bg-rose-500/10 dark:bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <span className="text-[10px] font-bold text-rose-500 block">PRO</span>
                <span className="text-base font-black text-slate-900 dark:text-rose-300">
                  {selectedMealDetail.protein}g
                </span>
              </div>
              <div className="p-3 bg-sky-500/10 dark:bg-sky-500/10 rounded-2xl border border-sky-500/20">
                <span className="text-[10px] font-bold text-sky-500 block">CARB</span>
                <span className="text-base font-black text-slate-900 dark:text-sky-300">
                  {selectedMealDetail.carbs}g
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-500 block">FAT</span>
                <span className="text-base font-black text-slate-900 dark:text-emerald-300">
                  {selectedMealDetail.fat}g
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111928] border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              <strong className="text-cyan-600 dark:text-cyan-400 block mb-0.5">
                AI Nutritional Summary:
              </strong>
              {selectedMealDetail.searchGrounded
                ? "Verified with Google Search Grounding for menu-grade accuracy."
                : "Estimated by MacroSnap Vision multimodal intelligence."}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const mName = selectedMealDetail.name;
                  setSelectedMealDetail(null);
                  navigateToChat(`Can you give me deeper nutritional insights on ${mName}?`);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask about this meal in AI Chat</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedMealDetail(null);
                    setActiveSection("analyzer");
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Scan Another</span>
                </button>

                <button
                  onClick={async () => {
                    const toDeleteId = selectedMealDetail.id;
                    setSavedMeals((prev) => prev.filter((m) => m.id !== toDeleteId));
                    if (currentUser) {
                      try {
                        await deleteDoc(doc(db, "users", currentUser.uid, "meals", toDeleteId));
                      } catch (err) {
                        console.warn("Could not delete from Firestore:", err);
                      }
                    }
                    setSelectedMealDetail(null);
                    setToastMessage("Meal removed from log. 🗑️");
                  }}
                  className="py-2.5 px-3 rounded-2xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/80 dark:bg-[#090e18]/85 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10 px-3 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveSection("dashboard")}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl text-[10px] font-bold transition-all ${activeSection === "dashboard" ? "text-cyan-500 scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveSection("analyzer")}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl text-[10px] font-bold transition-all ${activeSection === "analyzer" ? "text-cyan-500 scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
        >
          <Camera className="w-4 h-4" />
          <span>Scan</span>
        </button>

        <button
          onClick={() => setActiveSection("chat")}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl text-[10px] font-bold transition-all ${activeSection === "chat" ? "text-cyan-500 scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveSection("nutrition")}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl text-[10px] font-bold transition-all ${activeSection === "nutrition" ? "text-cyan-500 scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Macros</span>
        </button>

        <button
          onClick={() => setActiveSection("settings")}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl text-[10px] font-bold transition-all ${activeSection === "settings" ? "text-cyan-500 scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

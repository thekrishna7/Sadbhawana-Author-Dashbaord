"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  PenLine,
  Shield,
  Check,
  Coins,
  ChevronRight,
  Globe,
  Award,
  Sparkles,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Sliders,
  DollarSign,
  ArrowUpRight,
  MessageSquare,
  BookOpenCheck,
  CheckCircle,
  FileText,
} from "lucide-react";

// Featured books mock metadata
const FEATURED_BOOKS = [
  {
    id: 1,
    title: "The Dustbin Diaries",
    author: "Dr. Alok Gupta",
    genre: "Noval",
    desc: "",
    image: "/book1.jpg",
    accent: "from-violet-500/20 to-zinc-500/10",
    color: "rgba(139, 92, 246, 0.4)",
  },
  {
    id: 2,
    title: "Unforgettable Memories",
    author: "Dr. Raj Kishor Tewari",
    genre: "Memorable",
    desc: "",
    image: "/book2.png",
    accent: "from-emerald-500/20 to-zinc-500/10",
    color: "rgba(16, 185, 129, 0.4)",
  },
  {
    id: 3,
    title: "Fundamental Features of Microsoft Word",
    author: "Krishna Sharmah",
    genre: "Education",
    desc: "",
    image: "/book3.jpg",
    accent: "from-amber-500/20 to-zinc-500/10",
    color: "rgba(245, 158, 11, 0.4)",
  },
];

// Publishing Packages
const PACKAGES = [
  {
    name: "Classic",
    price: "₹49,999",
    desc: "Perfect for debut authors who want high-quality standard publishing and global digital reach.",
    features: [
      "Professional Copyediting",
      "Custom Softcover design",
      "ISBN & Copyright registration",
      "E-book & Paperback formats",
      "Global distribution (Amazon, Flipkart)",
      "Standard Royalty Split",
      "Author Dashboard basic access",
    ],
    accent: "border-white/5 bg-white/2 hover:border-white/10",
    badge: null,
  },
  {
    name: "Premium Elite",
    price: "₹99,999",
    desc: "Designed for serious writers seeking premium marketing campaigns and custom production elements.",
    features: [
      "Comprehensive Line Editing",
      "Deluxe Matte Hardcover + Softcover",
      "ISBN, Copyright & Barcode setup",
      "Audiobook conversion ready",
      "Global distribution + Retail pitching",
      "Advanced Amazon SEO & Marketing (1 mo)",
      "75% Author Royalty Split",
      "Author Dashboard & Analytics access",
      "Press Release release & media kits",
    ],
    accent: "border-violet-500/30 bg-violet-950/5 hover:border-violet-500/50 glow-violet",
    badge: "Recommended",
  },
  {
    name: "Signature Luxury",
    price: "₹1,89,999",
    desc: "The ultimate author-to-brand transformation. Custom leather bindings, premium PR, and personal branding.",
    features: [
      "Developmental & Line Editing",
      "Custom Leather/Fabric cover with Foil accent",
      "E-Book, Hardcover & Audio book formats",
      "Worldwide retail distribution & representation",
      "Exclusive Author Website development",
      "Influencer Outreach & Virtual Book Tour",
      "85% Author Royalty Split (Highest in industry)",
      "Real-time Dashboard & Direct Slack Support",
      "National media coverage & launch press release",
      "Cinematic Book Trailer production",
    ],
    accent: "border-amber-500/20 bg-amber-950/5 hover:border-amber-500/40 glow-gold",
    badge: "Elite Brand Ecosystem",
  },
];

// Services
const SERVICES = [
  {
    title: "Book Publishing",
    desc: "End-to-end luxury book printing, binding, formatting, and publication management.",
    icon: BookOpenCheck,
    color: "group-hover:text-violet-400 bg-violet-500/10 text-violet-400",
  },
  {
    title: "Editorial & Editing",
    desc: "Rigorous proofreading, line-editing, and developmental critiques from industry experts.",
    icon: FileText,
    color: "group-hover:text-amber-400 bg-amber-500/10 text-amber-400",
  },
  {
    title: "Exquisite Cover Design",
    desc: "Custom award-winning illustrations, typography, and premium dust-jacket designs.",
    icon: Sparkles,
    color: "group-hover:text-emerald-400 bg-emerald-500/10 text-emerald-400",
  },
  {
    title: "ISBN & Copyright Guard",
    desc: "Complete registration, legal filings, cataloging-in-publication, and rights management.",
    icon: Shield,
    color: "group-hover:text-rose-400 bg-rose-500/10 text-rose-400",
  },
  {
    title: "Global Distribution",
    desc: "Reach readers worldwide through Amazon, Flipkart, IngramSpark, and offline bookstores.",
    icon: Globe,
    color: "group-hover:text-blue-400 bg-blue-500/10 text-blue-400",
  },
  {
    title: "Strategic Marketing",
    desc: "Targeted digital advertising, review campaigns, social media growth, and bestseller push.",
    icon: Coins,
    color: "group-hover:text-purple-400 bg-purple-500/10 text-purple-400",
  },
  {
    title: "Author Branding",
    desc: "Complete PR campaigns, website creation, media kits, and brand partnerships.",
    icon: PenLine,
    color: "group-hover:text-pink-400 bg-pink-500/10 text-pink-400",
  },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(FEATURED_BOOKS[0]);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Calculator states
  const [pages, setPages] = useState(250);
  const [retailPrice, setRetailPrice] = useState(399);
  const [volume, setVolume] = useState(1000);
  const [format, setFormat] = useState<"paperback" | "hardcover" | "ebook">("paperback");

  // Royalty Calculations
  const calculatePrintingCost = () => {
    if (format === "ebook") return 0;
    if (format === "hardcover") return 150 + pages * 0.5;
    return 60 + pages * 0.35; // paperback
  };

  const printingCost = calculatePrintingCost();
  const distributionFee = Math.round(retailPrice * 0.4); // 40% distribution cut
  const netMargin = Math.max(0, retailPrice - printingCost - distributionFee);

  // 70% author royalty split
  const royaltySplit = 0.70;
  const authorEarningsPerBook = netMargin * royaltySplit;
  const publisherEarningsPerBook = netMargin * (1 - royaltySplit);
  const totalAuthorEarnings = Math.round(authorEarningsPerBook * volume);

  // Form submission handler
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
    }, 5000);
  };

  return (
    <div className="min-h-screen text-zinc-100 selection:bg-violet-500/30 selection:text-violet-200">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[#050508] -z-20 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-[-10%] left-[20%] w-[80vw] h-[60vh] bg-violet-900/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-10%] w-[60vw] h-[60vh] bg-amber-900/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-[40%] left-[-10%] w-[50vw] h-[50vh] bg-blue-950/5 rounded-full blur-[150px] pointer-events-none" />
      </div>

      {/* STICKY NAVBAR */}
      <header className="sticky top-0 z-50 w-full px-6 py-4 flex justify-center">
        <nav className="glass w-full max-w-7xl rounded-3xl px-6 py-4 flex items-center justify-between border border-white/5 shadow-2xl transition-all duration-300">
          {/* Logo Area */}
          <div className="flex flex-col">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl font-black tracking-wider text-gradient font-serif">
                SADBHAWANA PUBLICATION
              </span>
            </Link>
            <span className="text-[9px] font-bold tracking-[0.25em] text-amber-500/80 uppercase pl-0.5">

            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-8">
            {[
              { label: "Home", href: "https://www.sadbhawanapublication.com/" },

            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-white transition px-4 py-2"
            >
              Author Portal
            </Link>
            <Link
              href="/login"
              className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-xs font-bold uppercase tracking-wider text-white rounded-2xl group bg-gradient-to-br from-violet-600 to-amber-500 group-hover:from-violet-600 group-hover:to-amber-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-violet-800"
            >
              <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-[#050508] rounded-[14px] group-hover:bg-opacity-0">
                Login To Your Author Dashboard
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-24 left-6 right-6 p-6 rounded-3xl glass-strong border border-white/10 shadow-2xl flex flex-col gap-4 lg:hidden"
            >
              {[
                { label: "Home", href: "#home" },
                { label: "About", href: "#about" },
                { label: "Services", href: "#services" },
                { label: "Book Store", href: "#bookstore" },
                { label: "Calculator", href: "#calculator" },
                { label: "Packages", href: "#packages" },
                { label: "Gallery", href: "#gallery" },
                { label: "Contact", href: "#contact" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-zinc-300 hover:text-white py-2 border-b border-white/5"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-zinc-300 hover:text-white"
                >
                  Author Portal
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-sm font-bold text-white shadow-lg shadow-violet-950/50"
                >
                  Login To Your Author Dashboard
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section id="home" className="relative pt-16 pb-24 md:pt-28 md:pb-36 px-6 max-w-7xl mx-auto overflow-hidden">
        {/* Background visual detail */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="grid lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Hero Content */}
          <div className="lg:col-span-6 space-y-8 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-widest uppercase"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              Revolutionizing Literary Masterpieces
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-gradient font-serif"
            >
              Transforming <br className="hidden md:inline" />
              Authors Into Brands
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-lg md:text-xl text-zinc-400 font-normal max-w-xl mx-auto lg:mx-0"
            >
              Premium publishing, distribution, branding, and author growth ecosystem. We print premium books and architect lifelong author careers.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4"
            >
              <a
                href="#services"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 px-8 py-4 font-bold text-white transition shadow-xl"
              >
                Explore Services
              </a>
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 px-8 py-4 font-bold text-white shadow-lg shadow-violet-950/50 transition duration-300"
              >
                Login To Dashboard <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>

          {/* Hero Visual Mockups */}
          <div className="lg:col-span-6 relative flex items-center justify-center h-[400px] md:h-[500px]">
            {/* Ambient Lighting Background */}
            <div className="absolute w-72 h-72 rounded-full bg-violet-600/20 blur-[80px] pointer-events-none animate-pulse" />
            <div className="absolute w-60 h-60 rounded-full bg-amber-500/10 blur-[90px] pointer-events-none" />

            {/* Book Mockup 1 (Floating Left) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -50, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, x: 0, rotate: -12 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute left-4 md:left-12 z-20 w-40 md:w-56"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="shadow-2xl shadow-black/80 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                <Image
                  src="/book1.png"
                  alt="The Ethereal Echo Book Cover"
                  width={224}
                  height={336}
                  priority
                  className="object-cover rounded-xl border border-white/10"
                />
              </motion.div>
            </motion.div>

            {/* Book Mockup 2 (Floating Right) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 50, rotate: 15 }}
              animate={{ opacity: 1, scale: 1, x: 0, rotate: 10 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
              className="absolute right-4 md:right-12 z-10 w-36 md:w-48"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="shadow-2xl shadow-black/80 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                <Image
                  src="/book2.png"
                  alt="Shadow of Silver Book Cover"
                  width={192}
                  height={288}
                  priority
                  className="object-cover rounded-xl border border-white/10"
                />
              </motion.div>
            </motion.div>

            {/* Central Luxury Glass Dashboard Card Overlay */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
              className="absolute bottom-2 md:bottom-8 z-30 w-72 md:w-96 glass-strong p-4 rounded-3xl border border-white/10 shadow-3xl glow-violet cursor-pointer hover:border-violet-500/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Author Portal Online</p>
                </div>
                <div className="h-5 w-5 rounded-md bg-white/5 flex items-center justify-center">
                  <ArrowUpRight className="h-3 w-3 text-zinc-500" />
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/5">
                <Image
                  src="/dashboard.png"
                  alt="Author Dashboard Interface Preview"
                  width={384}
                  height={240}
                  className="object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5 relative">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[130px] pointer-events-none" />

        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">Our Vision</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-serif">
              Crafting Legacies, <br />Not Just Pages.
            </h2>
            <p className="text-zinc-400 leading-relaxed font-normal text-base">
              At Sadbhawana Publication, we believe that every manuscript is a potential legacy. We have merged standard luxury book crafting with modern author technology.
            </p>
            <p className="text-zinc-400 leading-relaxed font-normal text-base">
              From hand-crafted dust jackets and premium cotton bindings to real-time manuscript tracking, royalty distributions, and dynamic PR ecosystems, we empower authors to evolve from writers into globally recognizable brands.
            </p>
            <div className="pt-4">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 text-sm font-bold text-amber-500 hover:text-amber-400 transition"
              >
                Submit Your Manuscript <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* About Glass Grid */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
            {[
              {
                title: "Exquisite Aesthetics",
                desc: "Every printed work features luxurious materials, modern cover design, and top-tier typography.",
                icon: Award,
              },
              {
                title: "Tech-Enabled Process",
                desc: "An exclusive Author Dashboard allows real-time tracking of editing, design, print, and sales metrics.",
                icon: Sparkles,
              },
              {
                title: "Global Distribution Network",
                desc: "Automatic placement in Amazon, Flipkart, major national retailers, and international catalogs.",
                icon: Globe,
              },
              {
                title: "Author-First Equity",
                desc: "We offer transparent royalty structures, regular monthly payouts, and absolute ownership of your rights.",
                icon: Coins,
              },
            ].map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass p-8 rounded-3xl border border-white/5 hover:border-white/10 hover:glow-violet transition-all duration-300 group"
              >
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 transition-transform">
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">Our Services</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-serif">
            A Complete Publishing Ecosystem
          </h2>
          <p className="text-sm md:text-base text-zinc-500">
            A luxury publishing experience means complete, high-fidelity services executed with extreme precision.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="glass p-8 rounded-3xl border border-white/5 hover:border-white/15 hover:glow-violet transition-all duration-300 group relative overflow-hidden"
            >
              {/* Overlay hover accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${service.color}`}>
                <service.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-violet-300 transition-colors">
                {service.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed font-normal">
                {service.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURED BOOKS SECTION */}
      <section id="bookstore" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* Spotlight Control Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">Featured Releases</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-serif">
                Luxury Editions
              </h2>
              <p className="text-sm md:text-base text-zinc-500 leading-relaxed">
                Browse our carefully curated luxury editions. Select a book to inspect its craft specifications, metadata, and design ethos.
              </p>
            </div>

            {/* List Selection */}
            <div className="space-y-3">
              {FEATURED_BOOKS.map((book) => (
                <button
                  key={book.id}
                  onClick={() => setSelectedBook(book)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${selectedBook.id === book.id
                    ? "bg-white/5 border-white/20 glow-violet shadow-xl"
                    : "bg-transparent border-white/5 hover:bg-white/2"
                    }`}
                >
                  <div>
                    <h3 className="font-bold text-white text-base">{book.title}</h3>
                    <p className="text-xs text-zinc-500 font-medium">{book.author} — <span className="text-amber-500/80">{book.genre}</span></p>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 text-zinc-500 transition-transform ${selectedBook.id === book.id ? "rotate-90 text-violet-400" : ""
                      }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Book Spotlight Visual Column */}
          <div className="lg:col-span-7 flex flex-col md:flex-row items-center gap-10 bg-gradient-to-br from-zinc-950 to-black p-8 md:p-12 rounded-[36px] border border-white/5 relative overflow-hidden shadow-2xl">
            {/* Dynamic Spotlight Glow */}
            <div
              className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-[100px] transition-all duration-700 pointer-events-none opacity-40"
              style={{ backgroundColor: selectedBook.color }}
            />

            {/* Book Cover Container */}
            <div className="w-52 md:w-64 shrink-0 relative perspective-1000">
              <motion.div
                key={selectedBook.id}
                initial={{ opacity: 0, rotateY: 30, scale: 0.95 }}
                animate={{ opacity: 1, rotateY: 12, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="shadow-3xl shadow-black/80 rounded-2xl border border-white/10 overflow-hidden"
              >
                <Image
                  src={selectedBook.image}
                  alt={selectedBook.title}
                  width={256}
                  height={384}
                  className="object-cover"
                />
              </motion.div>
            </div>

            {/* Book Details */}
            <div className="flex-1 space-y-6">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                {selectedBook.genre}
              </span>
              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-serif">{selectedBook.title}</h3>
                <p className="text-sm font-semibold text-amber-500/90">by {selectedBook.author}</p>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed font-normal">
                {selectedBook.desc}
              </p>
              <div className="pt-2">
                <button className="px-6 py-3 rounded-xl bg-white text-[#050508] font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5">
                  Request Review Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROYALTY & PACKAGES CALCULATOR */}
      <section id="calculator" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5 relative">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-[130px] pointer-events-none" />

        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">Earnings Estimator</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-serif">
            Interactive Royalty Calculator
          </h2>
          <p className="text-sm md:text-base text-zinc-500">
            Slide the configurations dynamically to preview publishing costs, net margins, and estimated total author earnings.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* Controls Column */}
          <div className="lg:col-span-7 glass-strong p-8 md:p-10 rounded-[32px] border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center gap-3">
              <Sliders className="h-5 w-5 text-violet-400" />
              <h3 className="text-xl font-bold text-white">Book Configuration</h3>
            </div>

            {/* Sliders Container */}
            <div className="space-y-6">
              {/* Page Count Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-zinc-400">Total Page Count</span>
                  <span className="font-bold text-white">{pages} pages</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={800}
                  step={10}
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-600 focus:outline-none"
                />
              </div>

              {/* Retail Price Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-zinc-400">Target Retail Price</span>
                  <span className="font-bold text-white">₹{retailPrice}</span>
                </div>
                <input
                  type="range"
                  min={199}
                  max={1999}
                  step={20}
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-600 focus:outline-none"
                />
              </div>

              {/* Volume Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-zinc-400">Estimated Sales Volume</span>
                  <span className="font-bold text-white">{volume.toLocaleString()} copies</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={10000}
                  step={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Book Format Selector */}
            <div className="space-y-3">
              <span className="text-sm font-semibold text-zinc-400">Format</span>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: "paperback", label: "Paperback" },
                  { id: "hardcover", label: "Hardcover" },
                  { id: "ebook", label: "E-Book" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFormat(item.id as any)}
                    className={`py-3 rounded-2xl font-bold text-xs uppercase tracking-wider border transition-all duration-200 ${format === item.id
                      ? "bg-violet-600 border-violet-500 text-white glow-violet"
                      : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/8"
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-5 bg-gradient-to-b from-zinc-950 to-black p-8 md:p-10 rounded-[32px] border border-white/5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-violet-600/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <h3 className="text-xl font-bold text-white">Projected Earnings</h3>

              {/* Financial metrics list */}
              <div className="space-y-4 pt-4">
                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                  <span className="text-zinc-500">Printing Cost / Book</span>
                  <span className="text-zinc-200 font-semibold">₹{Math.round(printingCost)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                  <span className="text-zinc-500">Distribution Fee (40%)</span>
                  <span className="text-zinc-200 font-semibold">₹{distributionFee}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                  <span className="text-zinc-500">Net Margin / Copy</span>
                  <span className="text-emerald-400 font-bold">₹{Math.round(netMargin)}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-zinc-500">Author Share (70%)</span>
                  <span className="text-violet-300 font-semibold">₹{authorEarningsPerBook.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Huge Display Total */}
            <div className="pt-8 relative z-10">
              <p className="text-xs uppercase font-bold tracking-widest text-zinc-500 mb-2">Total Author Income</p>
              <div className="flex items-baseline gap-1 text-gradient">
                <span className="text-3xl md:text-5xl font-black font-serif">₹{totalAuthorEarnings.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-zinc-600 mt-2 font-medium">
                *Estimated projection. Subject to local taxes and shipping splits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500 font-semibold">Modern Publishing Standard</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-serif">
            Transparency Is Our Craft
          </h2>
          <p className="text-sm md:text-base text-zinc-500">
            Say goodbye to traditional dark holes in publishing. Enjoy real-time tracking from writing to royalty payouts.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Real-time Tracking",
              desc: "Trace your manuscript status dynamically from initial editing, proofing, layout, to printing status.",
              highlight: "Live Pipelines",
            },
            {
              title: "Transparent Royalties",
              desc: "Instant ledger logs detailing every sale on Amazon, Flipkart, or offline bookstores directly in your account.",
              highlight: "Decentralized Logs",
            },
            {
              title: "Collaborative Workspace",
              desc: "Direct chats with layout creators, cover designs reviews, and senior editors within one platform.",
              highlight: "Slack-like Speeds",
            },
            {
              title: "Strategic Advisory",
              desc: "One-on-one branding guidance to pitch articles, organize launch parties, and build media presence.",
              highlight: "Enterprise Support",
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className="glass p-8 rounded-3xl border border-white/5 hover:border-white/10 hover:glow-violet transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 rounded-full px-3 py-1 border border-amber-500/20 inline-block">
                  {item.highlight}
                </span>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed font-normal">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* AUTHOR DASHBOARD EXPERIENCE SHOWCASE */}
      <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5 relative overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="grid lg:grid-cols-12 gap-16 items-center relative z-10">
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">Real-time Platform</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-serif">
              The Author <br className="hidden md:inline" />
              Operating System
            </h2>
            <p className="text-zinc-400 leading-relaxed font-normal text-base">
              Say goodbye to email delays. With our custom platform, authors gain instant feedback from the production crew.
            </p>
            <div className="space-y-4">
              {[
                "Track editing stages live",
                "Approve book covers and print layouts",
                "Inspect sales ledgers & download invoices",
                "Chat directly with your designated designer & editor",
              ].map((val) => (
                <div key={val} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-emerald-400" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-300">{val}</span>
                </div>
              ))}
            </div>
            <div className="pt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 px-6 py-3.5 font-bold text-xs uppercase tracking-widest text-white shadow-lg shadow-violet-950/50"
              >
                Access Portal Demo <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="glass-strong p-4 rounded-[36px] border border-white/10 shadow-3xl glow-violet cursor-pointer hover:border-violet-500/30 transition-all duration-300 relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                <span className="bg-white text-black font-bold uppercase text-xs tracking-wider px-6 py-3 rounded-xl shadow-2xl">
                  Launch Demo Workspace
                </span>
              </div>
              <div className="rounded-[28px] overflow-hidden border border-white/5">
                <Image
                  src="/dashboard.png"
                  alt="Author workspace UI dashboard screenshot mockup"
                  width={800}
                  height={500}
                  className="object-cover w-full h-auto"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>



      {/* CONTACT SECTION / SUBMISSION FORM */}
      <section id="contact" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">Contact Us</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-serif">
                Pitch Your Manuscript
              </h2>
              <p className="text-sm md:text-base text-zinc-500 leading-relaxed font-normal">
                Aspiring creators are welcomed to submit their synopses. Our editorial review team assesses pitches within 7 business days.
              </p>
            </div>

            {/* Brand Contact Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-violet-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase">Email HQ</p>
                  <p className="text-sm font-semibold text-white">sadbhawanapublication@gmail.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-amber-500">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase">Phone Support</p>
                  <p className="text-sm font-semibold text-white">+91 7987484155 / +91 8109065947</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase">HQ Office</p>
                  <p className="text-sm font-semibold text-white">Near, Rajiv Gandhi School Ambah Morena (M.P.), India - 476111</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 glass-strong p-8 md:p-10 rounded-[32px] border border-white/5 shadow-2xl relative">
            <AnimatePresence>
              {contactSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 bg-[#0c0c12]/95 backdrop-blur-md rounded-[32px] p-8 flex flex-col items-center justify-center text-center space-y-4 z-20"
                >
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white font-serif">Submission Received</h3>
                  <p className="text-zinc-500 text-sm max-w-sm">
                    Thank you! Your manuscript pitch has been successfully logged. Our editorial board will review it and follow up within 7 business days.
                  </p>
                  <button
                    onClick={() => setContactSuccess(false)}
                    className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-300 hover:text-white font-semibold text-xs uppercase"
                  >
                    Send another pitch
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="E.g. Elena Vance"
                    className="w-full rounded-2xl border border-white/10 bg-[#050508]/60 px-4 py-3 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="E.g. elena@writer.com"
                    className="w-full rounded-2xl border border-white/10 bg-[#050508]/60 px-4 py-3 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Book Title</label>
                  <input
                    required
                    type="text"
                    placeholder="Working title"
                    className="w-full rounded-2xl border border-white/10 bg-[#050508]/60 px-4 py-3 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Genre</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-[#050508]/60 px-4 py-3.5 text-sm text-zinc-400 focus:border-violet-500 focus:outline-none focus:text-white"
                  >
                    <option>Fiction</option>
                    <option>Fantasy / Sci-Fi</option>
                    <option>Mystery / Thriller</option>
                    <option>Biography / Memoir</option>
                    <option>Poetry</option>
                    <option>Self-Help / Business</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Word Count</label>
                  <input
                    required
                    type="text"
                    placeholder="E.g. 75,000"
                    className="w-full rounded-2xl border border-white/10 bg-[#050508]/60 px-4 py-3 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Synopsis & Pitch</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Outline the key concepts, conflict, target audience, and current draft status..."
                  className="w-full rounded-2xl border border-white/10 bg-[#050508]/60 px-4 py-3 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-violet-950/50"
              >
                Submit Pitch Package
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-16 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-wider text-gradient font-serif">SADBHAWANA PUBLICATION</span>
              <span className="text-[8px] font-bold tracking-[0.2em] text-amber-500/80 uppercase">
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-normal">
              Merging luxury material craft and modern tech integration to elevate authors into premium global brands.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold text-white tracking-widest">Navigation</h4>
            <div className="flex flex-col gap-2">
              {["Home", "About", "Services", "Book Store", "Calculator"].map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase().replace(" ", "")}`}
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Legal / Policy */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold text-white tracking-widest">HQ Operations</h4>
            <div className="flex flex-col gap-2">
              {["Manuscript Submission", "Production Pipeline", "Royalty Disbursal", "Partner Invoicing", "Privacy Policy"].map((link) => (
                <a
                  key={link}
                  href="#contact"
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Copyright/Credentials */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold text-white tracking-widest">Author Platform</h4>
            <p className="text-xs text-zinc-500 leading-relaxed font-normal">
              Authorized personnel only. Access logging in progress.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-violet-400 hover:text-violet-300 transition"
              >
                Go to login portal →
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-10 mt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-zinc-600 font-medium">
            © {new Date().getFullYear()} Sadbhawana Publication. All rights reserved.
          </p>
          <div className="flex gap-6 text-[10px] text-zinc-600 font-medium">
            <a href="#contact" className="hover:text-zinc-400">Terms of Service</a>
            <a href="#contact" className="hover:text-zinc-400">Privacy Policy</a>
            <a href="#contact" className="hover:text-zinc-400">HQ Guidelines</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

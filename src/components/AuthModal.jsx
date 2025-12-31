// src/components/AuthModal.jsx
import React, { useState } from "react";
import { useAuth } from "../state/auth";

export default function AuthModal({ onClose }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [userType, setUserType] = useState("client"); // client, business
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("ndoemo02@gmail.com");
  const [password, setPassword] = useState("••••••");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      onClose();
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Hasła nie są takie same.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp(email, password);
      onClose();
      alert("Rejestracja pomyślna! Sprawdź swój e-mail, aby potwierdzić konto.");
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  // Stan do kontrolowania animacji wejścia/wyjścia
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Czekaj na zakończenie animacji
  };

  return (
    <>
      {/* Tło (overlay) z intensywniejszym blur */}
      <div
        className="fixed inset-0 z-[102] bg-black/80 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />
      
      {/* Nowoczesny Modal z Glassmorphism */}
      <div
        className={[
          "fixed inset-0 z-[103] flex items-center justify-center p-4 transition-opacity duration-300",
          isClosing ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <div className="relative w-full max-w-md">
          {/* Tab Header z Glassmorphism */}
          <div className="flex items-center justify-between mb-4">
            <div className={`backdrop-blur-xl rounded-2xl px-6 py-3 border shadow-2xl ${
              isLoginView 
                ? "bg-black/40 border-white/20" 
                : "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30"
            }`}>
              <span className="text-white text-sm font-medium">
                {isLoginView ? "Logowanie - Klient" : "Rejestracja - Klient"}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 text-white/70 hover:text-white hover:bg-black/60 transition-all duration-300 flex items-center justify-center shadow-2xl hover:shadow-white/10"
              aria-label="Zamknij modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Content z Glassmorphism */}
          <div className="bg-black/30 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-8 relative overflow-hidden">
            {/* Subtelny gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 rounded-3xl pointer-events-none" />
            {/* Header z Glassmorphism */}
            <div className="mb-8 relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-xl backdrop-blur-sm border flex items-center justify-center ${
                  isLoginView 
                    ? "bg-gradient-to-br from-orange-400/20 to-pink-400/20 border-orange-400/30" 
                    : "bg-gradient-to-br from-blue-400/20 to-purple-400/20 border-blue-400/30"
                }`}>
                  <span className={`text-lg ${
                    isLoginView ? "text-orange-300" : "text-blue-300"
                  }`}>
                    {isLoginView ? "→" : "📝"}
                  </span>
                </div>
                <h2 className={`text-white text-2xl font-bold bg-clip-text text-transparent ${
                  isLoginView 
                    ? "bg-gradient-to-r from-orange-300 to-pink-300" 
                    : "bg-gradient-to-r from-blue-300 to-purple-300"
                }`}>
                  {isLoginView ? "Logowanie" : "Rejestracja"}
                </h2>
              </div>
              <p className="text-white/70 text-sm ml-11">
                {isLoginView ? "Zaloguj się jako klient" : "Zarejestruj się jako klient"}
              </p>
            </div>

            {/* Form z Glassmorphism */}
            {isLoginView ? (
              <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                {error && (
                  <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-300 text-sm p-4 rounded-2xl shadow-lg">
                    {error}
                  </div>
                )}
                
                {/* Email */}
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-3">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all duration-300 shadow-lg hover:shadow-white/10"
                    placeholder="Wprowadź email"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-3">Hasło</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-6 py-4 bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all duration-300 pr-14 shadow-lg hover:shadow-white/10"
                      placeholder="Wprowadź hasło"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-300 p-1 rounded-lg hover:bg-white/10"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-orange-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-orange-500/25 hover:scale-[1.02] backdrop-blur-sm border border-orange-400/20"
                >
                  {loading ? "Logowanie..." : "Zaloguj się"}
                </button>

                {/* Google Login Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium py-4 px-6 rounded-2xl hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-white/10 hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Zaloguj się z Google
                </button>

                {/* Links z Glassmorphism */}
                <div className="text-center space-y-3">
                  <button
                    type="button"
                    onClick={() => alert('Funkcja wkrótce!')}
                    className="text-white/60 hover:text-orange-300 text-sm transition-colors duration-300 hover:bg-white/5 px-4 py-2 rounded-xl"
                  >
                    Nie pamiętasz hasła?
                  </button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsLoginView(false)}
                      className="text-white/70 text-sm"
                    >
                      Nie masz konta? <span className="text-orange-300 hover:text-orange-200 transition-colors duration-300 font-medium">Zarejestruj się</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6 relative z-10">
                {error && (
                  <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-300 text-sm p-4 rounded-2xl shadow-lg">
                    {error}
                  </div>
                )}
                
                {/* Email */}
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-3">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 shadow-lg hover:shadow-white/10"
                    placeholder="Wprowadź email"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-3">Hasło</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 shadow-lg hover:shadow-white/10"
                    placeholder="Wprowadź hasło"
                    required
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-3">Powtórz hasło</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 shadow-lg hover:shadow-white/10"
                    placeholder="Powtórz hasło"
                    required
                  />
                </div>

                {/* Register Button - inny kolor */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-4 px-6 rounded-2xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-blue-500/25 hover:scale-[1.02] backdrop-blur-sm border border-blue-400/20"
                >
                  {loading ? "Rejestrowanie..." : "Zarejestruj się"}
                </button>

                {/* Google Register Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium py-4 px-6 rounded-2xl hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-white/10 hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Zarejestruj się z Google
                </button>

                {/* Links z Glassmorphism */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsLoginView(true)}
                    className="text-white/70 text-sm"
                  >
                    Masz już konto? <span className="text-orange-300 hover:text-orange-200 transition-colors duration-300 font-medium">Zaloguj się</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
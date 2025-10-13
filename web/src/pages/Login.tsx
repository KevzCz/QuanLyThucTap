import React, { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/UseAuth";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-indigo-50 overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-violet-300/30 blur-3xl" />

      {/* Light blocks */}
      <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2 gap-8 opacity-60">
        <div className="m-6 rounded-3xl bg-indigo-100/40" />
        <div className="m-6 rounded-3xl bg-indigo-200/40" />
        <div className="m-6 rounded-3xl bg-indigo-200/40" />
        <div className="m-6 rounded-3xl bg-indigo-100/40" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-[440px]">
        {/* Badge */}
        <div className="mx-auto w-24 h-24 -mb-10 z-10 relative flex items-center justify-center rounded-full bg-yellow-300 ring-8 ring-yellow-200/70 shadow-xl">
          <span className="text-[20px] font-extrabold tracking-wider text-purple-900 drop-shadow-sm">
            HUFLIT
          </span>
        </div>

        <div className="relative rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_20px_60px_rgba(31,38,135,0.2)] p-8">
          {/* PUSH TITLES DOWN A BIT */}
          <div className="text-center mt-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Quản lý thực tập
            </h1>
            <p className="mt-1 text-sm text-gray-600">Đăng nhập tài khoản HUFLIT</p>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email của bạn
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      fill="currentColor"
                      d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5l8-5Z"
                    />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-xl border border-gray-300 pl-10 pr-3 text-[15px] placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                  placeholder="you@huflit.edu.vn"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {showPassword ? "Ẩn" : "Hiện"} mật khẩu
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      fill="currentColor"
                      d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2ZM10 6a2 2 0 1 1 4 0v2h-4V6Z"
                    />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl border border-gray-300 pl-10 pr-3 text-[15px] placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Helpers */}
            <div className="mt-2 flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-gray-700 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Ghi nhớ tôi
              </label>
              <button type="button" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit – centered pill button */}
            <div className="mt-4 flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center px-10 h-12 rounded-full
                          bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold
                          tracking-wide shadow-lg shadow-indigo-500/20
                          hover:from-indigo-700 hover:to-violet-700
                          focus:outline-none focus:ring-4 focus:ring-indigo-200 transition
                          disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} HUFLIT • All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

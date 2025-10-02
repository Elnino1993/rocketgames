"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"

interface Collectible {
  id: number
  x: number
  y: number
  collected: boolean
}

export default function RocketGame() {
  const [rocketPosition, setRocketPosition] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [score, setScore] = useState(0)
  const [isGameStarted, setIsGameStarted] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [showExplosion, setShowExplosion] = useState(false)
  const [horizontalOffset, setHorizontalOffset] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [isFalling, setIsFalling] = useState(false)
  const [gameStartTime, setGameStartTime] = useState<number>(0)
  const [hasEscaped, setHasEscaped] = useState(false)
  const [showPlanetTravel, setShowPlanetTravel] = useState(false)
  const [travelProgress, setTravelProgress] = useState(0)
  const [collectibles, setCollectibles] = useState<Collectible[]>([])
  const [collectedCount, setCollectedCount] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const velocityRef = useRef<number>(0)
  const targetVelocityRef = useRef<number>(0)
  const horizontalVelocityRef = useRef<number>(0)
  const rotationVelocityRef = useRef<number>(0)
  const lastExplosionCheckRef = useRef<number>(0)
  const lastCollectibleSpawnRef = useRef<number>(0)
  const collectibleIdRef = useRef<number>(0)

  const startGame = () => {
    setIsGameStarted(true)
    setRocketPosition(0)
    setSpeed(0)
    setScore(0)
    setIsGameOver(false)
    setShowExplosion(false)
    setHorizontalOffset(0)
    setRotation(0)
    setIsFalling(false)
    setGameStartTime(Date.now())
    setHasEscaped(false)
    setShowPlanetTravel(false)
    setTravelProgress(0)
    setCollectibles([])
    setCollectedCount(0)
    velocityRef.current = 0
    targetVelocityRef.current = 0
    horizontalVelocityRef.current = 0
    rotationVelocityRef.current = 0
    lastExplosionCheckRef.current = 0
    lastCollectibleSpawnRef.current = 0
    collectibleIdRef.current = 0
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space" && isGameStarted && !isGameOver) {
        e.preventDefault()
        setSpacePressed(true)
      }
    },
    [isGameStarted, isGameOver],
  )

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === "Space") {
      setSpacePressed(false)
    }
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  useEffect(() => {
    if (!isGameStarted || isGameOver) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const gameLoop = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime
      }

      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = currentTime

      if (currentTime - lastCollectibleSpawnRef.current > 2000) {
        lastCollectibleSpawnRef.current = currentTime
        const newCollectible: Collectible = {
          id: collectibleIdRef.current++,
          x: Math.random() * (window.innerWidth - 100) + 50,
          y: Math.random() * (window.innerHeight - 300) + 100,
          collected: false,
        }
        setCollectibles((prev) => [...prev, newCollectible])
      }

      setCollectibles((prev) =>
        prev.map((collectible) => {
          if (collectible.collected) return collectible

          const distance = Math.sqrt(
            Math.pow(mousePosition.x - collectible.x, 2) + Math.pow(mousePosition.y - collectible.y, 2),
          )

          if (distance < 40) {
            setCollectedCount((count) => count + 1)
            return { ...collectible, collected: true }
          }

          return collectible
        }),
      )

      setCollectibles((prev) => prev.filter((c) => !c.collected))

      setRocketPosition((prev) => {
        const isNearGround = prev < 100

        if (spacePressed) {
          setIsFalling(false)
          const thrust = isNearGround ? 4 : 2.5
          targetVelocityRef.current = thrust

          setSpeed((s) => Math.min(s + 0.3, 15))
          setScore((s) => s + 1)
        } else {
          setIsFalling(true)
          const gravity = isNearGround ? 1.5 : 3
          targetVelocityRef.current = -gravity

          setSpeed((s) => Math.max(s - 0.5, 0))
        }

        const lerpFactor = 0.15
        velocityRef.current += (targetVelocityRef.current - velocityRef.current) * lerpFactor

        const newPosition = prev + velocityRef.current

        if (newPosition > window.innerHeight - 150) {
          setHasEscaped(true)
          setShowPlanetTravel(true)
        }

        const timeSinceStart = Date.now() - gameStartTime
        const canCrash = timeSinceStart > 4000

        if (newPosition <= 0 && canCrash && !spacePressed) {
          setIsGameOver(true)
          setShowExplosion(true)
          return 0
        }

        return Math.max(newPosition, 0)
      })

      if (isFalling && !isGameOver) {
        setHorizontalOffset((prev) => {
          const drift = (Math.random() - 0.5) * 0.5 * deltaTime * 100
          horizontalVelocityRef.current += drift
          horizontalVelocityRef.current *= 0.95
          const newOffset = prev + horizontalVelocityRef.current
          return Math.max(-100, Math.min(100, newOffset))
        })

        setRotation((prev) => {
          const spin = (Math.random() - 0.5) * 0.5 * deltaTime * 100
          rotationVelocityRef.current += spin
          rotationVelocityRef.current *= 0.95
          return prev + rotationVelocityRef.current
        })
      } else {
        setHorizontalOffset((prev) => prev * 0.9)
        setRotation((prev) => prev * 0.9)
        horizontalVelocityRef.current *= 0.9
        rotationVelocityRef.current *= 0.9
      }

      if (rocketPosition > 100) {
        if (currentTime - lastExplosionCheckRef.current > 1000) {
          lastExplosionCheckRef.current = currentTime
          const baseChance = 0.01
          const reducedChance = Math.max(0.001, baseChance - collectedCount * 0.002)
          const randomChance = Math.random()
          if (randomChance < reducedChance) {
            setIsGameOver(true)
            setShowExplosion(true)
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      lastTimeRef.current = 0
    }
  }, [isGameStarted, spacePressed, isGameOver, gameStartTime, isFalling, rocketPosition, mousePosition, collectedCount])

  useEffect(() => {
    if (!showPlanetTravel) return

    const travelInterval = setInterval(() => {
      setTravelProgress((prev) => {
        const newProgress = prev + 1

        const baseChance = 0.02
        const reducedChance = Math.max(0.005, baseChance - collectedCount * 0.003)

        if (newProgress > 20 && Math.random() < reducedChance) {
          setShowPlanetTravel(false)
          setIsGameOver(true)
          setShowExplosion(true)
          return prev
        }

        if (newProgress >= 100) {
          setShowPlanetTravel(false)
          setIsGameOver(true)
          return 100
        }

        return newProgress
      })
    }, 50)

    return () => clearInterval(travelInterval)
  }, [showPlanetTravel, collectedCount])

  return (
    <main className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-black via-indigo-950 via-30% to-sky-400 transition-colors duration-1000">
      <div className="absolute inset-0">
        {[...Array(150)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full transition-opacity duration-2000"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 70 + "%",
              opacity: Math.random() * 0.8 + 0.2,
              animation: `smoothTwinkle ${Math.random() * 4 + 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute transition-opacity duration-1000"
            style={{
              left: `${i * 15 - 10}%`,
              top: `${15 + i * 8}%`,
              opacity: 0.2,
              animation: `smoothFloat ${5 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            <div className="flex gap-2">
              <div className="w-16 h-10 bg-white rounded-full blur-sm transition-all duration-1000" />
              <div className="w-20 h-12 bg-white rounded-full -ml-6 blur-sm transition-all duration-1000" />
              <div className="w-14 h-10 bg-white rounded-full -ml-6 blur-sm transition-all duration-1000" />
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes smoothTwinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes smoothFloat {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.15;
          }
          50% {
            transform: translateY(-10px) translateX(5px);
            opacity: 0.25;
          }
        }

        @keyframes collectPulse {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.1) rotate(180deg);
          }
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${i * 15 - 10}%`,
              top: `${15 + i * 8}%`,
              opacity: 0.2,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            <div className="flex gap-2">
              <div className="w-16 h-10 bg-white rounded-full blur-sm" />
              <div className="w-20 h-12 bg-white rounded-full -ml-6 blur-sm" />
              <div className="w-14 h-10 bg-white rounded-full -ml-6 blur-sm" />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-green-600 via-green-700 to-green-800 border-t-4 border-green-500">
        {/* City skyline with varied buildings */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-1 px-4">
          {/* Skyscraper 1 */}
          <div
            className="relative bg-gradient-to-b from-gray-600 to-gray-800 border-2 border-gray-700"
            style={{ width: "45px", height: "140px" }}
          >
            <div className="grid grid-cols-3 gap-1 p-1">
              {[...Array(18)].map((_, i) => (
                <div key={i} className={`w-2 h-2 ${i % 3 === 0 ? "bg-yellow-300" : "bg-yellow-400"}`} />
              ))}
            </div>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-6 bg-gray-700 border-2 border-gray-600" />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-1 h-4 bg-red-500">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Office building */}
          <div
            className="relative bg-gradient-to-b from-blue-900 to-blue-950 border-2 border-blue-800"
            style={{ width: "35px", height: "110px" }}
          >
            <div className="grid grid-cols-2 gap-1 p-1">
              {[...Array(14)].map((_, i) => (
                <div key={i} className="w-3 h-2 bg-cyan-300" />
              ))}
            </div>
          </div>

          {/* Tall skyscraper */}
          <div
            className="relative bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-slate-800"
            style={{ width: "50px", height: "160px" }}
          >
            <div className="grid grid-cols-4 gap-0.5 p-1">
              {[...Array(32)].map((_, i) => (
                <div key={i} className={`w-2 h-2 ${Math.random() > 0.3 ? "bg-orange-300" : "bg-gray-800"}`} />
              ))}
            </div>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-red-600 text-white text-[6px] flex items-center justify-center font-bold">
              BANK
            </div>
          </div>

          {/* Modern glass building */}
          <div
            className="relative bg-gradient-to-br from-sky-300 to-sky-600 border-2 border-sky-700 opacity-80"
            style={{ width: "40px", height: "130px" }}
          >
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {[...Array(24)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-white/30" />
              ))}
            </div>
          </div>

          {/* Residential building */}
          <div
            className="relative bg-gradient-to-b from-orange-700 to-orange-900 border-2 border-orange-800"
            style={{ width: "30px", height: "90px" }}
          >
            <div className="grid grid-cols-2 gap-1 p-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-yellow-200" />
              ))}
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-600" />
          </div>

          {/* Corporate tower */}
          <div
            className="relative bg-gradient-to-b from-emerald-800 to-emerald-950 border-2 border-emerald-900"
            style={{ width: "42px", height: "145px" }}
          >
            <div className="grid grid-cols-3 gap-1 p-1">
              {[...Array(21)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-green-300" />
              ))}
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-emerald-700 flex items-center justify-center">
              <div className="w-3 h-2 bg-yellow-400" />
            </div>
          </div>

          {/* Hotel building */}
          <div
            className="relative bg-gradient-to-b from-rose-800 to-rose-950 border-2 border-rose-900"
            style={{ width: "38px", height: "120px" }}
          >
            <div className="grid grid-cols-3 gap-0.5 p-1">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-amber-200" />
              ))}
            </div>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[6px] text-white font-bold">HOTEL</div>
          </div>

          {/* Small shop */}
          <div
            className="relative bg-gradient-to-b from-amber-600 to-amber-800 border-2 border-amber-900"
            style={{ width: "25px", height: "50px" }}
          >
            <div className="absolute top-2 left-1 w-4 h-3 bg-cyan-300 border border-cyan-500" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-5 bg-amber-950" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
          </div>

          {/* Tech building */}
          <div
            className="relative bg-gradient-to-b from-purple-800 to-purple-950 border-2 border-purple-900"
            style={{ width: "48px", height: "135px" }}
          >
            <div className="grid grid-cols-4 gap-0.5 p-0.5">
              {[...Array(28)].map((_, i) => (
                <div key={i} className={`w-2 h-2 ${i % 4 === 0 ? "bg-purple-400" : "bg-blue-300"}`} />
              ))}
            </div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-4 bg-purple-700 border border-purple-600" />
          </div>

          {/* Apartment complex */}
          <div
            className="relative bg-gradient-to-b from-stone-600 to-stone-800 border-2 border-stone-700"
            style={{ width: "36px", height: "100px" }}
          >
            <div className="grid grid-cols-3 gap-1 p-1">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-orange-200" />
              ))}
            </div>
            <div className="absolute top-0 left-0 right-0 flex justify-around p-0.5">
              <div className="w-1 h-1 bg-red-500 rounded-full" />
              <div className="w-1 h-1 bg-red-500 rounded-full" />
            </div>
          </div>

          {/* Shopping mall */}
          <div
            className="relative bg-gradient-to-b from-teal-700 to-teal-900 border-2 border-teal-800"
            style={{ width: "55px", height: "80px" }}
          >
            <div className="grid grid-cols-5 gap-1 p-1">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-yellow-300" />
              ))}
            </div>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] text-white font-bold bg-red-600 px-1">
              MALL
            </div>
          </div>

          {/* Office tower 2 */}
          <div
            className="relative bg-gradient-to-b from-indigo-800 to-indigo-950 border-2 border-indigo-900"
            style={{ width: "40px", height: "125px" }}
          >
            <div className="grid grid-cols-3 gap-1 p-1">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-blue-200" />
              ))}
            </div>
          </div>

          {/* Small house */}
          <div className="flex flex-col items-center">
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "15px solid transparent",
                borderRight: "15px solid transparent",
                borderBottom: "18px solid #7C2D12",
              }}
            />
            <div className="w-8 h-12 bg-amber-700 border border-amber-900 relative">
              <div className="absolute top-2 left-1.5 w-2 h-2 bg-yellow-300" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-4 bg-amber-950" />
            </div>
          </div>

          {/* Another skyscraper */}
          <div
            className="relative bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-800"
            style={{ width: "44px", height: "150px" }}
          >
            <div className="grid grid-cols-4 gap-0.5 p-1">
              {[...Array(28)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-yellow-400" />
              ))}
            </div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-10 h-8 bg-gray-700 border-2 border-gray-600">
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-4 bg-red-500">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Trees and greenery */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-8">
          {[...Array(20)].map((_, i) => (
            <div key={`tree-${i}`} className="flex flex-col items-center">
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: `${Math.random() * 8 + 8}px solid transparent`,
                  borderRight: `${Math.random() * 8 + 8}px solid transparent`,
                  borderBottom: `${Math.random() * 20 + 20}px solid ${i % 3 === 0 ? "#166534" : "#15803d"}`,
                }}
              />
              <div className="bg-amber-900" style={{ width: "3px", height: `${Math.random() * 8 + 6}px` }} />
            </div>
          ))}
        </div>

        {/* Launch pad */}
        {(!isGameStarted || rocketPosition < 50) && !showExplosion && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-gray-600 border-t-4 border-gray-400 z-10">
            <div className="absolute -top-2 left-2 right-2 h-2 bg-red-500" />
            <div className="absolute -top-1 left-4 w-1 h-8 bg-gray-500" />
            <div className="absolute -top-1 right-4 w-1 h-8 bg-gray-500" />
          </div>
        )}
      </div>

      {isGameStarted && !isGameOver && !showPlanetTravel && (
        <>
          {collectibles.map((collectible) => (
            <div
              key={collectible.id}
              className="absolute cursor-pointer transition-all duration-200 hover:scale-110"
              style={{
                left: `${collectible.x}px`,
                top: `${collectible.y}px`,
                animation: "collectPulse 2s ease-in-out infinite",
                pointerEvents: "auto",
              }}
            >
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/octopus_no%20hat%20%282%29-kc8QAhShlcjPsQKC9oj2v7o5a8Lsqz.png"
                alt="collectible"
                className="w-16 h-16"
              />
            </div>
          ))}
        </>
      )}

      {isGameStarted && !isGameOver && !showPlanetTravel && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: `${Math.min(rocketPosition + 32, window.innerHeight - 100)}px`,
            transform: `translateX(calc(-50% + ${horizontalOffset}px)) rotate(${rotation}deg)`,
            willChange: "transform",
          }}
        >
          <div className="relative">
            <div className={`relative ${spacePressed ? "scale-110" : "scale-100"} transition-transform duration-100`}>
              <svg width="80" height="120" viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 0L55 25V85H25V25L40 0Z" fill="url(#rocketGradient)" stroke="#DC2626" strokeWidth="2" />
                <path d="M40 0L50 20H30L40 0Z" fill="#B91C1C" />
                <circle cx="40" cy="35" r="10" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" />
                <circle cx="40" cy="35" r="6" fill="#60A5FA" />
                <rect x="25" y="50" width="30" height="3" fill="#FCD34D" />
                <rect x="25" y="60" width="30" height="3" fill="#FCD34D" />
                <rect x="25" y="70" width="30" height="3" fill="#FCD34D" />
                <rect x="28" y="55" width="8" height="20" fill="#1E40AF" rx="2" />
                <rect x="44" y="55" width="8" height="20" fill="#1E40AF" rx="2" />
                <path d="M25 60L5 90L25 82V60Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
                <path d="M55 60L75 90L55 82V60Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
                <path d="M25 70L10 85L25 80V70Z" fill="#FCD34D" />
                <path d="M55 70L70 85L55 80V70Z" fill="#FCD34D" />
                <path d="M30 85H50V95L45 100H35L30 95V85Z" fill="#374151" stroke="#1F2937" strokeWidth="2" />
                <circle cx="40" cy="90" r="4" fill="#DC2626" />
                <rect x="20" y="75" width="8" height="30" fill="#6B7280" stroke="#374151" strokeWidth="2" rx="2" />
                <rect x="52" y="75" width="8" height="30" fill="#6B7280" stroke="#374151" strokeWidth="2" rx="2" />

                <defs>
                  <linearGradient id="rocketGradient" x1="40" y1="0" x2="40" y2="85">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="50%" stopColor="#DC2626" />
                    <stop offset="100%" stopColor="#B91C1C" />
                  </linearGradient>
                </defs>
              </svg>

              {speed > 0 && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-2">
                  <div
                    className="absolute left-1/2 -translate-x-1/2 animate-pulse"
                    style={{
                      width: "35px",
                      height: `${speed * 10}px`,
                      background: "linear-gradient(to bottom, #FEF3C7, #FCD34D, #F59E0B, #EF4444, transparent)",
                      borderRadius: "50% 50% 50% 50% / 20% 20% 80% 80%",
                      filter: "blur(2px)",
                    }}
                  />

                  <div
                    className="absolute -left-6 animate-pulse"
                    style={{
                      width: "20px",
                      height: `${speed * 8}px`,
                      background: "linear-gradient(to bottom, #FCD34D, #F59E0B, #EF4444, transparent)",
                      borderRadius: "50% 50% 50% 50% / 20% 20% 80% 80%",
                      filter: "blur(1px)",
                      animationDelay: "0.1s",
                    }}
                  />
                  <div
                    className="absolute -right-6 animate-pulse"
                    style={{
                      width: "20px",
                      height: `${speed * 8}px`,
                      background: "linear-gradient(to bottom, #FCD34D, #F59E0B, #EF4444, transparent)",
                      borderRadius: "50% 50% 50% 50% / 20% 20% 80% 80%",
                      filter: "blur(1px)",
                      animationDelay: "0.15s",
                    }}
                  />

                  {speed > 5 && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 animate-pulse"
                      style={{
                        width: "50px",
                        height: `${speed * 15}px`,
                        background: "linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)",
                        borderRadius: "50%",
                        filter: "blur(8px)",
                        top: "20px",
                      }}
                    />
                  )}
                </div>
              )}

              {spacePressed && (
                <div className="absolute inset-0 animate-ping">
                  <div className="w-full h-full rounded-full bg-orange-400 opacity-20" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPlanetTravel && (
        <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950 to-purple-950 z-30">
          <div className="absolute inset-0">
            {[...Array(200)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-white rounded-full"
                style={{
                  width: Math.random() * 3 + 1 + "px",
                  height: Math.random() * 3 + 1 + "px",
                  left: Math.random() * 100 + "%",
                  top: Math.random() * 100 + "%",
                  opacity: Math.random() * 0.8 + 0.2,
                  animation: `twinkle ${Math.random() * 3 + 2}s infinite`,
                }}
              />
            ))}
          </div>

          <div className="absolute top-20 right-20 animate-pulse">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 shadow-2xl shadow-blue-500/50" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-300 to-blue-700 opacity-70" />
              <div className="absolute top-8 left-8 w-12 h-12 rounded-full bg-blue-900/40" />
              <div className="absolute top-16 right-10 w-8 h-8 rounded-full bg-blue-900/30" />
            </div>
          </div>

          <div
            className="absolute left-1/2 -translate-x-1/2 transition-all duration-1000 ease-linear"
            style={{
              bottom: `${20 + travelProgress * 0.6}%`,
              transform: `translateX(-50%) scale(${0.5 + travelProgress * 0.01})`,
            }}
          >
            <svg width="60" height="90" viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M40 0L55 25V85H25V25L40 0Z" fill="url(#rocketGradient)" stroke="#DC2626" strokeWidth="2" />
              <path d="M40 0L50 20H30L40 0Z" fill="#B91C1C" />
              <circle cx="40" cy="35" r="10" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" />
              <circle cx="40" cy="35" r="6" fill="#60A5FA" />
              <rect x="25" y="50" width="30" height="3" fill="#FCD34D" />
              <rect x="25" y="60" width="30" height="3" fill="#FCD34D" />
              <rect x="25" y="70" width="30" height="3" fill="#FCD34D" />
              <path d="M30 85H50V95L45 100H35L30 95V85Z" fill="#374151" stroke="#1F2937" strokeWidth="2" />
              <defs>
                <linearGradient id="rocketGradient" x1="40" y1="0" x2="40" y2="85">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="50%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#B91C1C" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute left-1/2 -translate-x-1/2 top-full">
              <div
                className="absolute left-1/2 -translate-x-1/2 animate-pulse"
                style={{
                  width: "30px",
                  height: "80px",
                  background: "linear-gradient(to bottom, #FEF3C7, #FCD34D, #F59E0B, #EF4444, transparent)",
                  borderRadius: "50% 50% 50% 50% / 20% 20% 80% 80%",
                  filter: "blur(3px)",
                }}
              />
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6 bg-black/40 backdrop-blur-md p-12 rounded-2xl border-2 border-blue-500/50 shadow-2xl">
              <h2 className="text-4xl font-bold text-white">Journey to New Planet</h2>
              <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${travelProgress}%` }}
                />
              </div>
              <p className="text-white/80 text-lg">{Math.floor(travelProgress)}% of journey completed</p>
              <p className="text-white/60 text-sm">Final score: {score}</p>
              <p className="text-purple-400 text-sm font-bold">Collected items: {collectedCount}</p>
            </div>
          </div>
        </div>
      )}

      {!isGameStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center space-y-6 bg-black/40 backdrop-blur-md p-12 rounded-2xl border-2 border-orange-500/50 shadow-2xl">
            <div className="text-7xl mb-4 animate-bounce">🚀</div>
            <h2 className="text-5xl font-bold text-white">Space Rocket</h2>
            <p className="text-white/90 text-lg max-w-md leading-relaxed">
              Launch the rocket into space! Press{" "}
              <kbd className="px-3 py-1 bg-orange-500/30 rounded-md font-mono border border-orange-500">SPACE</kbd> to
              accelerate!
            </p>
            <Button
              onClick={startGame}
              size="lg"
              className="text-xl px-8 py-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg"
            >
              Launch Rocket
            </Button>
          </div>
        </div>
      )}

      {isGameOver && !showPlanetTravel && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center space-y-6 bg-black/60 backdrop-blur-md p-12 rounded-2xl border-2 border-red-500/50 shadow-2xl">
            {hasEscaped && !showExplosion ? (
              <>
                <div className="text-7xl mb-4">🌟</div>
                <h2 className="text-5xl font-bold text-green-400">Success!</h2>
                <div className="space-y-2">
                  <p className="text-white text-3xl font-bold">Final Score: {score}</p>
                  <p className="text-white/70 text-lg">You reached a new planet!</p>
                  <p className="text-purple-400 text-lg font-bold">Collected items: {collectedCount}</p>
                </div>
                <p className="text-white/90 text-lg max-w-md">
                  Congratulations! The rocket successfully completed an interplanetary journey!
                </p>
              </>
            ) : showExplosion ? (
              <>
                <div className="text-7xl mb-4">💥</div>
                <h2 className="text-5xl font-bold text-red-500">
                  {rocketPosition > 100 ? "Explosion in Flight!" : "Crash!"}
                </h2>
                <div className="space-y-2">
                  <p className="text-white text-3xl font-bold">Final Score: {score}</p>
                  <p className="text-white/70 text-lg">Maximum Height: {Math.floor(rocketPosition)}m</p>
                  <p className="text-purple-400 text-lg font-bold">Collected items: {collectedCount}</p>
                </div>
                <p className="text-white/90 text-lg max-w-md">
                  {rocketPosition > 100
                    ? "The rocket exploded during flight! Try again."
                    : "The rocket crashed to the ground! Don't forget to press space."}
                </p>
              </>
            ) : null}
            <Button
              onClick={startGame}
              size="lg"
              className="text-xl px-8 py-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {isGameStarted && !isGameOver && !showPlanetTravel && (
        <>
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-lg border-2 border-purple-500/50 flex items-center gap-3">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/octopus_no%20hat%20%282%29-kc8QAhShlcjPsQKC9oj2v7o5a8Lsqz.png"
                alt="collectible"
                className="w-8 h-8"
              />
              <span className="text-white text-2xl font-bold">{collectedCount}</span>
            </div>
          </div>

          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-10">
            <p className="text-white/80 text-sm text-center bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm">
              Press{" "}
              <kbd className="px-2 py-1 bg-orange-500/30 rounded font-mono text-xs border border-orange-400">SPACE</kbd>{" "}
              to accelerate
            </p>
          </div>
        </>
      )}
    </main>
  )
}

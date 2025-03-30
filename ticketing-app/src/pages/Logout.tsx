import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

function Logout() {
  const navigate = useNavigate()

  useEffect(() => {
    // This would normally handle actual logout logic
    const logoutTimeout = setTimeout(() => {
      navigate("/")
    }, 2000)

    return () => clearTimeout(logoutTimeout)
  }, [navigate])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Logging out...</h1>
      <p className="text-neutral-500">Please wait</p>
    </div>
  )
}

export default Logout 
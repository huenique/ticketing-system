import { Link } from "react-router-dom"

function NotFound() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mb-6 text-xl text-neutral-500">Page not found</p>
      <Link 
        to="/" 
        className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}

export default NotFound 
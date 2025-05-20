import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <h1 className="text-7xl font-bold text-gray-900">404</h1>
      <p className="mb-6 text-xl text-gray-700 font-medium">Page not found</p>
      <Link
        to="/"
        className="rounded-md bg-blue-700 px-5 py-3 text-white text-lg font-medium hover:bg-blue-800 border-0 shadow-md"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

export default NotFound;

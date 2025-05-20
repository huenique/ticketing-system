import { useState, useEffect } from "react";
import { checkFulltextSearchCapability, getSearchSetupInstructions } from "@/utils/create-fulltext-index";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertTriangle } from "lucide-react";

interface SearchIndexCheckProps {
  collectionId: string;
  searchField?: string;
}

export function SearchIndexCheck({ collectionId, searchField = "name" }: SearchIndexCheckProps) {
  const [status, setStatus] = useState<"checking" | "available" | "unavailable" | "error">("checking");
  const [message, setMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  
  const checkSearchCapability = async () => {
    setIsChecking(true);
    setStatus("checking");
    
    try {
      const result = await checkFulltextSearchCapability(collectionId, searchField);
      
      if (result.hasFulltextIndex) {
        setStatus("available");
        setMessage(result.message);
      } else if (result.error?.includes("fulltext index")) {
        setStatus("unavailable");
        setMessage(result.message);
        setErrorDetails(result.error);
      } else {
        setStatus("error");
        setMessage("An error occurred while checking search capability");
        setErrorDetails(result.error || "Unknown error");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Failed to check search capability");
      setErrorDetails(error instanceof Error ? error.message : String(error));
    } finally {
      setIsChecking(false);
    }
  };
  
  useEffect(() => {
    checkSearchCapability();
  }, [collectionId, searchField]);
  
  const setupInstructions = getSearchSetupInstructions();
  
  return (
    <div className="p-4 max-w-2xl mx-auto">
      {status === "checking" && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
          <AlertTitle>Checking search capability</AlertTitle>
          <AlertDescription>
            Verifying if fulltext search is available for {collectionId}.{searchField}...
          </AlertDescription>
        </Alert>
      )}
      
      {status === "available" && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-500 mr-2" />
          <AlertTitle>Fulltext search available</AlertTitle>
          <AlertDescription>
            {message}
          </AlertDescription>
        </Alert>
      )}
      
      {status === "unavailable" && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
          <AlertTitle>Fulltext search unavailable</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{message}</p>
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? "Hide Setup Instructions" : "Show Setup Instructions"}
              </Button>
            </div>
            
            {showDetails && (
              <div className="mt-4 space-y-4">
                <p className="font-medium">{setupInstructions.title}</p>
                <p>{setupInstructions.message}</p>
                <ol className="list-decimal pl-6 space-y-1">
                  {setupInstructions.steps.map((step, index) => (
                    <li key={index} className="text-sm">{step}</li>
                  ))}
                </ol>
                
                <div className="bg-gray-900 text-gray-100 p-3 rounded mt-4 overflow-x-auto">
                  <p className="text-xs text-gray-400 mb-2">CLI Command:</p>
                  <code className="text-sm">{setupInstructions.cli_command}</code>
                </div>
                
                <div className="mt-4">
                  <p className="font-medium">Error Details</p>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto mt-2">
                    {errorDetails}
                  </pre>
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkSearchCapability}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : "Check Again"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {status === "error" && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
          <AlertTitle>Error checking search capability</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{message}</p>
            <p className="text-sm text-red-600">{errorDetails}</p>
            
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkSearchCapability}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : "Try Again"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default SearchIndexCheck; 
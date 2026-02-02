import { useNavigate } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center space-y-6 max-w-md">
        <div className="relative">
          <div className="text-9xl font-bold text-slate-800">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-20 h-20 text-blue-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Page Not Found</h1>
          <p className="text-slate-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

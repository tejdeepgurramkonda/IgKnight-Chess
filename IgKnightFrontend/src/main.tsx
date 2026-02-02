
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster 
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          error: 'bg-red-900 border-red-600 text-white',
          success: 'bg-green-900 border-green-600 text-white',
          warning: 'bg-yellow-900 border-yellow-600 text-white',
          info: 'bg-blue-900 border-blue-600 text-white',
        },
      }}
    />
  </>
);
  
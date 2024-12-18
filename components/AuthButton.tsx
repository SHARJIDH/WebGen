import { UserButton, SignInButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";

export default function AuthButton() {
  const { isSignedIn } = useAuth();
  
  return (
    <div className="absolute top-4 right-4 z-50">
      {isSignedIn ? (
        <UserButton afterSignOutUrl="/" />
      ) : (
        <SignInButton mode="modal">
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
            Sign In
          </button>
        </SignInButton>
      )}
    </div>
  );
}

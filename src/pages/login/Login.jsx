import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [corpList, setCorpList] = useState([]);
  const [selectedCorpId, setSelectedCorpId] = useState("");
  const [seconds, setSeconds] = useState(30);
  const [isActive, setIsActive] = useState(false);

  const { login, getCorporatesByEmail, sendCorporateLoginOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer = null;
    if (isActive && seconds > 0) {
      timer = setInterval(() => setSeconds((prev) => prev - 1), 1000);
    } else if (seconds === 0) {
      setIsActive(false);
    }
    return () => clearInterval(timer);
  }, [isActive, seconds]);

  const handleGetCorporates = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await getCorporatesByEmail(email);
      const rawList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];

      const normalizedList = rawList
        .filter((corp) => corp?.id && corp?.name)
        .map((corp) => ({
          id: corp.id,
          name: corp.name,
          gstNumber: corp.gstNumber || corp.gstin || "",
        }));

      if (!normalizedList.length) {
        throw new Error("No corporations found for this email");
      }

      setCorpList(normalizedList);
      setSelectedCorpId(
        normalizedList.length === 1 ? normalizedList[0].id : "",
      );
      setCurrentStep(2);
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Failed to fetch corporations");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!selectedCorpId) {
      toast.error("Please select a corporation");
      return;
    }

    setLoading(true);
    try {
      const response = await sendCorporateLoginOtp(email, selectedCorpId);
      toast.success(response?.message || "OTP sent successfully!");
      setCurrentStep(3);
      setSeconds(30);
      setIsActive(true);
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleCorporateLogin = async () => {
    if (!otp || otp.length < 4) {
      toast.error("Please enter a valid OTP");
      return;
    }
    if (!selectedCorpId) {
      toast.error("Please select a corporation");
      return;
    }

    setLoading(true);
    try {
      await login(email, otp, selectedCorpId);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentStep === 1) {
      await handleGetCorporates();
    } else if (currentStep === 2) {
      await handleSendOtp();
    } else {
      await handleCorporateLogin();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-secondary/30"
      data-testid="login-page"
    >
      <div
        className="w-full max-w-md p-8 bg-card rounded-lg border border-border shadow-sm"
        data-testid="login-form"
      >
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold font-['Manrope'] text-primary mb-2"
            data-testid="login-title"
          >
            AP Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            Accounts Payable Management
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled={currentStep > 1}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
          </div>

          {currentStep >= 2 && (
            <div>
              <Label htmlFor="corporate">Select Corporate</Label>
              <Select
                value={selectedCorpId}
                onValueChange={setSelectedCorpId}
                disabled={currentStep === 3}
              >
                <SelectTrigger id="corporate" data-testid="input-corporate">
                  <SelectValue placeholder="Select Corporate" />
                </SelectTrigger>
                <SelectContent>
                  {corpList.map((corp) => (
                    <SelectItem key={corp.id} value={corp.id}>
                      {`${corp.name} (GSTIN: ${corp.gstNumber || "N/A"})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <>
            {currentStep === 3 && (
              <div>
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter OTP"
                  required
                  data-testid="input-otp"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="submit-button"
            >
              {loading
                ? "Processing..."
                : currentStep === 1
                  ? "Continue"
                  : currentStep === 2
                    ? "Send OTP"
                    : "Login"}
            </Button>

            {currentStep === 2 && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setCurrentStep(1);
                  setCorpList([]);
                  setSelectedCorpId("");
                  setOtp("");
                }}
                disabled={loading}
              >
                Change Email
              </Button>
            )}

            {currentStep === 3 && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleSendOtp}
                disabled={loading || isActive}
              >
                {isActive ? `Resend OTP in ${seconds}s` : "Resend OTP"}
              </Button>
            )}
          </>
        </form>
      </div>
    </div>
  );
};

export default Login;

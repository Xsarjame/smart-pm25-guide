import { useState, useEffect } from "react";
import { AirQualityCard } from "@/components/AirQualityCard";
import { HealthProfileForm, UserHealthProfile } from "@/components/HealthProfileForm";
import { HealthProfileDisplay } from "@/components/HealthProfileDisplay";
import { HealthRecommendations } from "@/components/HealthRecommendations";
import { AlertNotification } from "@/components/AlertNotification";
import { NearbyHospitals } from "@/components/NearbyHospitals";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, RefreshCw, User, Hospital } from "lucide-react";
import heroImage from "@/assets/hero-clean-air.jpg";

const Index = () => {
  const [pm25Value, setPm25Value] = useState(45);
  const [location, setLocation] = useState("กรุงเทพมหานคร");
  const [userProfile, setUserProfile] = useState<UserHealthProfile | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentTime = new Date().toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Load saved profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('healthProfile');
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error('Failed to load profile:', e);
      }
    }
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setPm25Value(Math.floor(Math.random() * 100) + 10);
      setIsRefreshing(false);
    }, 1000);
  };

  const handleSaveProfile = (profile: UserHealthProfile) => {
    setUserProfile(profile);
    localStorage.setItem('healthProfile', JSON.stringify(profile));
    setShowProfileForm(false);
  };

  const handleEditProfile = () => {
    setShowProfileForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-sky">
      {/* Hero Section */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img 
          src={heroImage} 
          alt="Clean Air" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2 px-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              Smart PM2.5 Health
            </h1>
            <p className="text-white/90 drop-shadow-md">
              ระบบเฝ้าระวังคุณภาพอากาศเพื่อสุขภาพที่ดี
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
        {/* Alert Notification */}
        <AlertNotification 
          pm25={pm25Value} 
          location={location}
          hasHealthConditions={userProfile !== null && userProfile.conditions.length > 0}
        />

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
            className="flex-1 min-w-[140px]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            อัพเดทข้อมูล
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-w-[140px]"
          >
            <MapPin className="w-4 h-4 mr-2" />
            เปลี่ยนพื้นที่
          </Button>
          {!userProfile && (
            <Button
              onClick={() => setShowProfileForm(true)}
              className="flex-1 min-w-[140px] bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <User className="w-4 h-4 mr-2" />
              ตั้งค่าโปรไฟล์
            </Button>
          )}
        </div>

        {/* Air Quality Card */}
        <AirQualityCard 
          pm25={pm25Value} 
          location={location}
          timestamp={currentTime}
        />

        {/* User Profile Display or Form */}
        {userProfile && !showProfileForm ? (
          <HealthProfileDisplay 
            profile={userProfile}
            onEdit={handleEditProfile}
          />
        ) : showProfileForm ? (
          <div className="animate-in slide-in-from-top-5 duration-500">
            <HealthProfileForm 
              onSave={handleSaveProfile}
              initialProfile={userProfile || undefined}
            />
          </div>
        ) : null}

        {/* Tabs for Recommendations and Hospitals */}
        <Tabs defaultValue="recommendations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recommendations">คำแนะนำสุขภาพ</TabsTrigger>
            <TabsTrigger value="hospitals">
              <Hospital className="w-4 h-4 mr-2" />
              โรงพยาบาล
            </TabsTrigger>
          </TabsList>
          <TabsContent value="recommendations" className="mt-4">
            <HealthRecommendations 
              pm25={pm25Value}
              hasHealthConditions={userProfile !== null && userProfile.conditions.length > 0}
              userConditions={userProfile?.conditions || []}
            />
          </TabsContent>
          <TabsContent value="hospitals" className="mt-4">
            <NearbyHospitals />
          </TabsContent>
        </Tabs>

        {/* Info Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>ข้อมูลอัพเดททุก 1 ชั่วโมง</p>
          <p className="text-xs mt-1">
            แหล่งข้อมูล: กรมควบคุมมลพิษ
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

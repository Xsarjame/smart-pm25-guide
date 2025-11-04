import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle, Droplets, Users, Wind as WindIcon } from "lucide-react";

interface HealthRecommendationsProps {
  pm25: number;
  hasHealthConditions?: boolean;
}

export const HealthRecommendations = ({ pm25, hasHealthConditions }: HealthRecommendationsProps) => {
  const getRecommendations = () => {
    if (pm25 <= 25) {
      return {
        icon: <Shield className="w-5 h-5 text-aqi-good" />,
        title: "คุณภาพอากาศดี",
        variant: "default" as const,
        items: [
          "สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ",
          "เหมาะสำหรับการออกกำลังกาย",
          "ไม่จำเป็นต้องสวมหน้ากากอนามัย",
        ]
      };
    }
    
    if (pm25 <= 37) {
      return {
        icon: <AlertCircle className="w-5 h-5 text-aqi-moderate" />,
        title: "คุณภาพอากาศปานกลาง",
        variant: "default" as const,
        items: [
          "ผู้ที่มีโรคประจำตัวควรลดการทำกิจกรรมกลางแจ้ง",
          "สังเกตอาการหากมีอาการผิดปกติ",
          "พิจารณาสวมหน้ากากอนามัยหากอยู่นอกบ้านนาน",
        ]
      };
    }

    if (pm25 <= 50) {
      return {
        icon: <AlertCircle className="w-5 h-5 text-aqi-unhealthy-sensitive" />,
        title: "มีผลกระทบต่อกลุ่มเสี่ยง",
        variant: "destructive" as const,
        items: [
          "กลุ่มเสี่ยงควรหลีกเลี่ยงกิจกรรมกลางแจ้ง",
          "สวมหน้ากาก N95 เมื่อออกจากบ้าน",
          "ปิดหน้าต่างประตู และใช้เครื่องฟอกอากาศในบ้าน",
          "ดื่มน้ำให้เพียงพอ",
        ]
      };
    }

    return {
      icon: <AlertCircle className="w-5 h-5 text-aqi-hazardous" />,
      title: "⚠️ อันตราย! หลีกเลี่ยงการออกจากบ้าน",
      variant: "destructive" as const,
      items: [
        "อยู่ในบ้านและปิดหน้าต่างประตูทั้งหมด",
        "ใช้เครื่องฟอกอากาศตลอดเวลา",
        "สวมหน้ากาก N95 หากจำเป็นต้องออกจากบ้าน",
        "หากมีอาการหายใจลำบาก ให้ไปพบแพทย์ทันที",
        "ดื่มน้ำอุ่นบ่อยๆ",
      ]
    };
  };

  const recommendations = getRecommendations();

  return (
    <Card className="shadow-card">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          {recommendations.icon}
          <h2 className="text-lg font-semibold text-foreground">
            {recommendations.title}
          </h2>
        </div>

        {hasHealthConditions && pm25 > 37 && (
          <Alert variant={recommendations.variant} className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              คุณอยู่ในกลุ่มเสี่ยง โปรดระมัดระวังเป็นพิเศษและปฏิบัติตามคำแนะนำอย่างเคร่งครัด
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {recommendations.items.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <p className="text-sm text-foreground">{item}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <Droplets className="w-5 h-5 mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">ดื่มน้ำ</p>
            </div>
            <div className="space-y-1">
              <Shield className="w-5 h-5 mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">สวมหน้ากาก</p>
            </div>
            <div className="space-y-1">
              <WindIcon className="w-5 h-5 mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">อยู่ในร่ม</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

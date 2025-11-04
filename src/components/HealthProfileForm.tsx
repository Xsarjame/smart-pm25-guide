import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Heart, Save } from "lucide-react";
import { toast } from "sonner";

const healthConditions = [
  { id: "asthma", label: "โรคหอบหืด" },
  { id: "copd", label: "โรคปอดอุดกั้นเรื้อรัง (COPD)" },
  { id: "heart", label: "โรคหัวใจ" },
  { id: "diabetes", label: "โรคเบาหวาน" },
  { id: "allergy", label: "โรคภูมิแพ้ทางเดินหายใจ" },
  { id: "elderly", label: "ผู้สูงอายุ (65 ปีขึ้นไป)" },
  { id: "children", label: "เด็กเล็ก (ต่ำกว่า 5 ปี)" },
  { id: "pregnant", label: "หญิงตั้งครรภ์" },
];

interface HealthProfileFormProps {
  onSave?: (conditions: string[]) => void;
}

export const HealthProfileForm = ({ onSave }: HealthProfileFormProps) => {
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  const handleToggle = (conditionId: string) => {
    setSelectedConditions(prev =>
      prev.includes(conditionId)
        ? prev.filter(id => id !== conditionId)
        : [...prev, conditionId]
    );
  };

  const handleSave = () => {
    onSave?.(selectedConditions);
    toast.success("บันทึกข้อมูลสุขภาพเรียบร้อยแล้ว", {
      description: `เลือกโรคประจำตัว ${selectedConditions.length} รายการ`
    });
  };

  return (
    <Card className="shadow-card">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-destructive" />
          <h2 className="text-xl font-semibold text-foreground">ข้อมูลสุขภาพของคุณ</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            เลือกโรคประจำตัวหรือภาวะสุขภาพที่คุณมี เพื่อรับคำแนะนำที่เหมาะสมกับคุณ
          </p>

          <div className="space-y-3">
            {healthConditions.map((condition) => (
              <div key={condition.id} className="flex items-center space-x-3">
                <Checkbox
                  id={condition.id}
                  checked={selectedConditions.includes(condition.id)}
                  onCheckedChange={() => handleToggle(condition.id)}
                />
                <Label
                  htmlFor={condition.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {condition.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleSave}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Save className="w-4 h-4 mr-2" />
          บันทึกข้อมูล
        </Button>
      </div>
    </Card>
  );
};

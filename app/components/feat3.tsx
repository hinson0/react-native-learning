/**
 * Props ≈ 函数参数 ≈ Pydantic Model

  # FastAPI — 参数验证
  class ExpenseInput(BaseModel):
      amount: float
      category: str
      note: Optional[str] = None

  @app.post("/expense")
  def create_expense(input: ExpenseInput):
      return {"message": f"记录: {input.category} {input.amount}元"}

  // React — Props 定义和接收
  interface ExpenseCardProps {
    amount: number
    category: string
    note?: string          // 可选 prop
  }

  const ExpenseCard = ({ amount, category, note }: ExpenseCardProps) => {
    //                  ↑ 解构 props（第 1 课学过）
    return (
      <View>
        <Text>{category}: {amount}元</Text>
        {note && <Text>备注: {note}</Text>}
      </View>
    )
    // {note && <Text>...</Text>} — 条件渲染：note 存在时才显示
    // ≈ Jinja2 的 {% if note %}<p>{{ note }}</p>{% endif %}
  }

  // 使用组件（≈ 调用函数，传参）
  <ExpenseCard amount={35.5} category="餐饮" note="午饭" />
  <ExpenseCard amount={15} category="交通" />   // note 可选，可不传
 */

import { Text, View } from "react-native";

interface ExpenseCardProps {
    amount: number;
    category: string;
    note?: string;
}

export const ExpenseCard3 = ({ amount, category, note }: ExpenseCardProps) => {
    return (
        <View>
            <Text>
                {category}: {amount}元
            </Text>
            {note && <Text>备注: {note}</Text>}
        </View>
    );
};

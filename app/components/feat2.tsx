/**
 * JSX — 在 JS 里写"模板"

  # FastAPI + Jinja2 — 模板和逻辑分离
  # template.html
  # <div>{{ category }}: {{ amount }}元</div>

  # endpoint.py
  return templates.TemplateResponse("template.html", {"category": "餐饮", "amount": 35.5})

  // React — 逻辑和模板在一起
  const ExpenseCard = () => {
    const category = "餐饮"
    const amount = 35.5

    return (
      <View>
        <Text>{category}: {amount}元</Text>
      </View>
    )
    // {} 里可以放任何 JS 表达式（≈ Jinja2 的 {{ }}）
  }
 */

import { Text, View } from "react-native";

export const ExpenseCard2 = () => {
    const category = "餐饮";
    const amount = 35.5;

    return (
        <View>
            <Text>
                {category}: {amount}元
            </Text>
        </View>
    );
};

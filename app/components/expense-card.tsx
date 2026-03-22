import { View, Text, StyleSheet } from 'react-native';

// React 组件就是一个返回 UI 的函数
const ExpenseCard = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.category}>餐饮</Text>
            <Text style={styles.amount}>35.5元</Text>
        </View>
    );
};

// 样式
const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        margin: 10,
    },
    category: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    amount: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
});

export default ExpenseCard;
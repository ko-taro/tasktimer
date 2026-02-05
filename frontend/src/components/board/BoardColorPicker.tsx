import { Box } from "@mui/material";

export const BOARD_COLORS = [
  "#fce4ec", // ピンク
  "#fff3e0", // オレンジ
  "#fff9c4", // イエロー
  "#e8f5e9", // グリーン
  "#e3f2fd", // ブルー
  "#ede7f6", // パープル
  "#fafafa", // グレー
  "#e0f7fa", // シアン
];

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export default function BoardColorPicker({ value, onChange }: Props) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {BOARD_COLORS.map((color) => (
        <Box
          key={color}
          onClick={() => onChange(color)}
          sx={{
            width: 24,
            height: 24,
            bgcolor: color,
            borderRadius: 0.5,
            cursor: "pointer",
            border: value === color ? "2px solid #333" : "2px solid #ddd",
            "&:hover": { opacity: 0.8 },
          }}
        />
      ))}
    </Box>
  );
}

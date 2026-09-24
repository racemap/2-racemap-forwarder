import type { ThemeConfig } from 'antd';
import { RacemapColors } from '../../consts';

// Same tokens as gears-frontend/src/lib/theme.ts, so the forwarder uses the RACEMAP blue.
export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: RacemapColors.PaleBlue,
    colorLink: RacemapColors.PaleBlue,
    colorBorder: RacemapColors.Gray,
    borderRadius: 3.5,
  },
  components: {
    Tabs: {
      titleFontSizeLG: 16,
      cardBg: RacemapColors.LightBlue,
      itemColor: RacemapColors.Headline,
      itemSelectedColor: RacemapColors.PaleBlue,
    },
    Table: {
      borderColor: RacemapColors.Gray,
      rowSelectedBg: RacemapColors.LightBlue,
    },
    Button: {
      colorLink: RacemapColors.PaleBlue,
      defaultColor: RacemapColors.PaleBlue,
    },
  },
};

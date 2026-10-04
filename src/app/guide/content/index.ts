import { startGroup } from './start';
import { usersGroup } from './users';
import { requestsGroup } from './requests';
import { contentGroup } from './content';
import { financeGroup } from './finance';
import { supportGroup } from './support';
import { educationGroup } from './education';
import { capdealGroup } from './capdeal';
import { storeGroup } from './store';
import type { GuideGroup } from './types';

export type { GuideBody, GuideGroup, GuideSection } from './types';

/** ลำดับเดียวกับเมนูหลังบ้าน (src/config/nav.tsx) */
export const guideGroups: GuideGroup[] = [
    startGroup,
    usersGroup,
    requestsGroup,
    contentGroup,
    financeGroup,
    supportGroup,
    educationGroup,
    capdealGroup,
    storeGroup,
];

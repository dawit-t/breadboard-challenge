import { registerAs } from '@nestjs/config';

export default registerAs('suppliers', () => ([
  {
    name: 'TTI',
    url: 'https://backend-takehome.s3.us-east-1.amazonaws.com/tti.json',
  },
  {
    name: 'Arrow',
    url: 'https://backend-takehome.s3.us-east-1.amazonaws.com/myarrow.json',
  },
]));

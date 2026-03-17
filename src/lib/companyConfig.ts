import type { CompanyConfig } from "@/lib/types";

export const TARGET_COMPANIES: CompanyConfig[] = [
  {
    company: "Amazon",
    aliases: ["Amazon Web Services (AWS)"],
    sourceType: "custom",
    careerUrl: "https://www.amazon.jobs/",
  },
  {
    company: "Microsoft",
    sourceType: "custom",
    careerUrl: "https://careers.microsoft.com/",
  },
  {
    company: "Accenture",
    sourceType: "custom",
    fallbackSourceType: "workday",
    careerUrl: "https://www.accenture.com/us-en/careers/jobsearch",
    fallbackCareerUrl: "https://accenture.wd103.myworkdayjobs.com/AccentureCareers",
  },
  {
    company: "Guidehouse",
    sourceType: "workday",
    careerUrl: "https://guidehouse.wd1.myworkdayjobs.com/External",
  },
  {
    company: "EY",
    aliases: ["Ernst & Young (EY)"],
    sourceType: "custom",
    careerUrl: "https://careers.ey.com/",
  },
  {
    company: "Deloitte",
    sourceType: "custom",
    careerUrl: "https://apply.deloitte.com/",
  },
  {
    company: "Appian",
    sourceType: "greenhouse",
    careerUrl: "https://careers.appian.com/jobs",
    fallbackCareerUrl: "https://job-boards.greenhouse.io/appian",
  },
  {
    company: "Marriott International",
    sourceType: "oracle_hcm",
    careerUrl: "https://ejwl.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/jobs",
  },
  {
    company: "Hilton",
    sourceType: "custom",
    fallbackSourceType: "taleo",
    careerUrl: "https://jobs.hilton.com/",
    fallbackCareerUrl:
      "https://hilton.taleo.net/careersection/hww_cs_internal_global/moresearch.ftl",
  },
  {
    company: "Alarm.com",
    sourceType: "greenhouse",
    careerUrl: "https://alarm.com/careers",
    fallbackCareerUrl: "https://job-boards.greenhouse.io/alarmcom",
  },
  {
    company: "Cvent",
    sourceType: "custom",
    careerUrl: "https://careers.cvent.com/jobs",
  },
  {
    company: "MITRE",
    aliases: ["MITRE Corporation"],
    sourceType: "custom",
    careerUrl: "https://careers.mitre.org/",
  },
  {
    company: "Leidos",
    sourceType: "workday",
    careerUrl: "https://leidos.wd5.myworkdayjobs.com/External",
  },
  {
    company: "SAIC",
    sourceType: "custom",
    careerUrl: "https://jobs.saic.com/",
  },
  {
    company: "CACI",
    sourceType: "custom",
    careerUrl: "https://searchcareers.caci.com/",
    fallbackCareerUrl: "https://searchcareers.caci.com/",
  },
  {
    company: "GDIT",
    sourceType: "workday",
    careerUrl: "https://gdit.wd5.myworkdayjobs.com/External_Career_Site",
    fallbackCareerUrl: "https://www.gdit.com/careers/search/",
  },
  {
    company: "Lockheed Martin",
    sourceType: "custom",
    fallbackSourceType: "brassring",
    careerUrl: "https://www.lockheedmartinjobs.com/search-jobs",
    fallbackCareerUrl:
      "https://sjobs.brassring.com/TGnewUI/Search/Home/Home?partnerid=25037&siteid=5014",
  },
  {
    company: "Peraton",
    sourceType: "icims",
    careerUrl: "https://careers-peraton.icims.com/jobs/search",
  },
  {
    company: "Noblis",
    sourceType: "custom",
    fallbackSourceType: "icims",
    careerUrl: "https://careers.noblis.org/jobs",
    fallbackCareerUrl: "https://noblis-nsp.icims.com/",
  },
  {
    company: "BAE Systems",
    sourceType: "custom",
    fallbackSourceType: "brassring",
    careerUrl: "https://jobs.baesystems.com/global/en/",
    fallbackCareerUrl:
      "https://sjobs.brassring.com/TGnewUI/Search/Home/Home?partnerid=25771&siteid=5403",
  },
  {
    company: "FINRA",
    sourceType: "custom",
    careerUrl: "https://www.finra.org/careers",
  },
  {
    company: "GEICO",
    sourceType: "workday",
    careerUrl: "https://geico.wd1.myworkdayjobs.com/External",
  },
  {
    company: "PenFed Credit Union",
    sourceType: "custom",
    careerUrl: "https://careers.penfed.org/jobs",
  },
  {
    company: "T. Rowe Price",
    sourceType: "custom",
    careerUrl: "https://www.troweprice.com/en/us/careers",
  },
  {
    company: "S&P Global",
    sourceType: "custom",
    careerUrl: "https://careers.spglobal.com/jobs",
  },
  {
    company: "World Bank Group",
    aliases: ["The World Bank Group / IMF"],
    sourceType: "custom",
    careerUrl: "https://worldbankgroup.csod.com/ux/ats/careersite/1/home?c=worldbankgroup",
  },
  {
    company: "International Monetary Fund (IMF)",
    aliases: ["The World Bank Group / IMF"],
    sourceType: "custom",
    careerUrl: "https://www.imf.org/en/about/recruitment/apply-now",
  },
  {
    company: "MicroStrategy",
    sourceType: "custom",
    careerUrl: "https://www.strategy.com/careers",
  },
  {
    company: "KPMG",
    sourceType: "custom",
    careerUrl: "https://www.kpmguscareers.com/",
  },
  {
    company: "AstraZeneca",
    sourceType: "custom",
    careerUrl: "https://careers.astrazeneca.com/location/united-states-jobs/7684/6252001/2/199889120000",
  },
  {
    company: "Capital One",
    sourceType: "custom",
    careerUrl: "https://www.capitalonecareers.com/en",
  },
  {
    company: "Wells Fargo",
    sourceType: "custom",
    careerUrl: "https://www.wellsfargojobs.com/en/jobs/",
  },
  {
    company: "Bloomberg",
    sourceType: "custom",
    careerUrl: "https://bloomberg.avature.net/careers/SearchJobs",
  },
  {
    company: "Fannie Mae",
    sourceType: "workday",
    careerUrl: "https://fanniemae.wd1.myworkdayjobs.com/en-US/FannieMaeCareers",
  },
  {
    company: "Navy Federal Credit Union",
    sourceType: "oracle_hcm",
    careerUrl:
      "https://fa-etbx-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/nfcu/jobs",
  },
];

export const TARGET_COMPANY_MAP = new Map<string, CompanyConfig>();

for (const company of TARGET_COMPANIES) {
  TARGET_COMPANY_MAP.set(company.company, company);
  for (const alias of company.aliases ?? []) {
    TARGET_COMPANY_MAP.set(alias, company);
  }
}

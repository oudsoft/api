const Sequelize = require('sequelize');

const RadUserTypeDef = {
			UserType_Name :  {
				type: Sequelize.STRING(40),
				allowNull: false
			},
			UserType_DESC :  {
				type: Sequelize.STRING,
			}
		};
const RadUserStatusDef = {
			UserStatus_Name :  {
				type: Sequelize.STRING(40),
				allowNull: false
			},
			UserStatus_DESC :  {
				type: Sequelize.STRING,
			}
		};
//UserType_ID
//UserStatus_ID
//UserInfo_ID
//Hos_ID
const RadUserDef = {
			username  :  {
				type: Sequelize.STRING(80),
				unique: true,
				allowNull: false
			},
			password  :  {
				type: Sequelize.STRING,
				get() {
					return () => this.getDataValue('password')
				}
			},
			salt: {
				type: Sequelize.STRING,
				get() {
					return() => this.getDataValue('salt')
				}
			}
		};

const RadUserInfoDef = {
			User_NameEN :  {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			User_LastNameEN :  {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			User_NameTH :  {
				type: Sequelize.STRING(80)
			},
			User_LastNameTH :  {
				type: Sequelize.STRING(80)
			},
			User_Email :  {
				type: Sequelize.STRING(60)
			},
			User_Phone :  {
				type: Sequelize.STRING(40),
				allowNull: false
			},
			User_LineID :  {
				type: Sequelize.STRING(80)
			},
			User_PathRadiant : {
				type: Sequelize.STRING
			},
			User_Hospitals : {
				type: Sequelize.JSON
			},
			User_SipPhone :  {
				type: Sequelize.STRING(10),
			},
			User_SipSecret :  {
				type: Sequelize.STRING(50),
			}
		};

//User_ID
const RadUserProfileDef = {
			Profile : {
				type: Sequelize.JSON
			}
		};

const RadHospitalDef = {
			Hos_Name : {
				type: Sequelize.STRING(150),
				allowNull: false
			},
			Hos_Address : {
				type: Sequelize.STRING,
				allowNull: false
			},
			Hos_Tel : {
				type: Sequelize.STRING(80)
			},
			Hos_WebUrl : {
				type: Sequelize.STRING(80)
			},
			Hos_Contact : {
				type: Sequelize.STRING
			},
			Hos_Remark : {
				type: Sequelize.STRING
			},
			Hos_Code : {
				type: Sequelize.STRING(3),
			}
		};

//Hos_ID
const RadOrthancDef = {
			Orthanc_Local : {
				type: Sequelize.JSON,
				allowNull: false
			},
			Orthanc_Cloud: {
				type: Sequelize.JSON,
				allowNull: false
			},
			Orthanc_Remark: {
				type: Sequelize.STRING
			}
		};

//Hos_ID
const RadUrgentTypeDef = {
			UGType : {
				type: Sequelize.STRING(20),
				allowNull: false
			},
			/*
				UGType -> standard / custom
			*/
			UGType_Name : {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			UGType_ColorCode: {
				type: Sequelize.STRING(10),
			},
			UGType_AcceptStep: {
				type: Sequelize.JSON,
			},
			UGType_WorkingStep: {
				type: Sequelize.JSON,
			},
			UGType_WarningStep: {
				type: Sequelize.JSON,
			}
		};

const RadGeneralStatusDef = {
			GS_Name: {
				type: Sequelize.STRING(40),
				allowNull: false
			},
			GS_Remark : {
				type: Sequelize.STRING,
			}
		};

//GS_ID
const RadCliameRightsDef = {
			CR_Name : {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			CR_Remark : {
				type: Sequelize.STRING,
			}
		};

//GeneralStatus_ID
const RadCaseStatusDef = {
			CS_Name_EN: {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			CS_Name_TH: {
				type: Sequelize.STRING(80)
			},
			CS_DESC: {
				type: Sequelize.STRING
			},
		};

//Hos_ID
const RadPatientDef = {
			Patient_HN : {
				type: Sequelize.STRING(50),
				allowNull: false
			},
			Patient_NameTH : {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			Patient_LastNameTH : {
				type: Sequelize.STRING(80),
				allowNull: true
			},
			Patient_NameEN : {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			Patient_LastNameEN : {
				type: Sequelize.STRING(80),
				allowNull: true
			},
			Patient_CitizenID : {
				type: Sequelize.STRING(20)
			},
			Patient_Birthday : {
				type: Sequelize.STRING(30),
			},
			Patient_Age : {
				type: Sequelize.STRING(5),
			},
			Patient_Sex : {
				type: Sequelize.STRING(1),
				allowNull: false
			},
			Patient_Tel : {
				type: Sequelize.STRING(30)
			},
			Patient_Address : {
				type: Sequelize.STRING
			}
		};

		//Hos_ID
const RadPriceChartDef = {
			Prices : {
				type: Sequelize.JSONB
			}
		};

//Ortanc_ID
const RadDicomTransferLogDef = {
			ResourceType : {
				type: Sequelize.STRING(15)
			},
			ResourceID : {
				type: Sequelize.STRING(50)
			},
			DicomTags : {
				type: Sequelize.JSON,
			},
			StudyTags : {
				type: Sequelize.JSONB
			}
		};

//Hos_ID
const RadHospitalReportDef = {
			Content : {
				type: Sequelize.JSON,
				allowNull: false
			},
			AutoConvert : {
				type: Sequelize.INTEGER, // <- 0=false, 1=true
				defaultValue: 0
			},
			RadioPreviewPDF : {
				type: Sequelize.INTEGER, // <- 0=false, 1=true
				defaultValue: 1
			}
		};

//Hos_ID
/*
const RadWorkingHourDef = {
			WH_Name : {
				type: Sequelize.STRING(50), //กะที่หนึ่ง, กะที่สอง, กะที่สาม, ...
				allowNull: false
			},
			WH : {
				type: Sequelize.JSON, //{from: '07.00', to: "16.00"}
				allowNull: false
			}
		};
*/
//Hos_ID
//User_ID <-- Radiologist
/*
const RadWorkingScheduleDef = {
			Date : {
				type: Sequelize.DATE,
				allowNull: false
			},
			WorkPlan : {
				type: Sequelize.JSON, //{WH_ID: 1, Status: "Y/N"}
				allowNull: false
			}
		};
*/
//User_ID <-- Radiologist
const RadTemplateDef = {
			Name : {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			Content : {
				type: Sequelize.TEXT,
				allowNull: false
			},
			Modality : {
				type: Sequelize.STRING(20),
			},
			StudyDescription : {
				type: Sequelize.STRING,
			},
			ProtocolName : {
				type: Sequelize.STRING,
			},
			Hospitals : {
				type: Sequelize.JSON, //<- [{id: 1}, ...] / [{id: 0}] <- id=0=All
			},
			AutoApply : {
				type: Sequelize.INTEGER, // <- 0=false, 1=true
				defaultValue: 0
			}
		};

//Hos_ID
//Case_ParentID
//Case_CSID
//Case_UGTypeID
//Case_UserID
//Case_CRID

const RadCaseDef = {
      Case_OrthancStudyID : {
				type: Sequelize.STRING(50),
				allowNull: false
			},
			Case_ACC : {
				type: Sequelize.STRING(50)
			},
			Case_BodyPart : {
				type: Sequelize.STRING(150)
			},
			Case_ScanPart : {
				type: Sequelize.JSON
			},
			Case_Modality : {
				type: Sequelize.STRING(40)
			},
			Case_Manufacturer : {
				type: Sequelize.STRING(120)
			},
			Case_ProtocolName : {
				type: Sequelize.STRING(130)
			},
			Case_StudyDescription : {
				type: Sequelize.STRING(130)
			},
			Case_StationName : {
				type: Sequelize.STRING(130)
			},
			Case_PatientHRLink : {
				type: Sequelize.JSON,
			},
			Case_RadiologistId : {
				type: Sequelize.INTEGER,
				allowNull: false
			},
			Case_RefferalId : {
				type: Sequelize.INTEGER,
				allowNull: false
			},
			Case_RefferalName : {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			Case_Department : {
				type: Sequelize.STRING(80),
				allowNull: false
			},
			Case_Price : {
				type: Sequelize.FLOAT,
				allowNull: false
			},
			Case_DESC : {
				type: Sequelize.TEXT
			},
			Case_StudyInstanceUID : {
				type: Sequelize.STRING(60)
			},
			Case_DicomZipFilename : {  // <- advance tempolary zip file
				type: Sequelize.STRING
			}
		};

//User_ID <-- Radiologist
//Case_ID
const RadCaseResponseDef = {
			Response_HTML : {
				type: Sequelize.TEXT
			},
			Response_Text : {
				type: Sequelize.TEXT
			},
			Response_Type : {
				type: Sequelize.STRING(10)
			},
			Response_A4Height : {
				type: Sequelize.FLOAT,
				defaultValue: 0
			}
			/* Response_Type => 'normal/draft' */
		};

//Case_ID
//User_ID <-- ผู้ออกรายงาน
//Response_ID <-- ใช้ผลอ่านไหน
const RadCaseReportDef = {
			Remark : {
				type: Sequelize.TEXT
			},
			Report_Type : {
				type: Sequelize.STRING(20)
				/* Type => normal/attention/cristical/preliminary */
			},
			PDF_Filename : {
				type: Sequelize.STRING(90)
			},
			Status : {
				type: Sequelize.STRING(30)
			},
			Log : {
				type: Sequelize.JSON
			},
			PDF_DicomSeriesIds : {
				type: Sequelize.JSONB
			},
			SeriesInstanceUIDs : {
				type: Sequelize.JSONB
			},
			SOPInstanceUIDs : {
				type: Sequelize.JSONB
			}
		};

//User_ID <- usertype 2/4
const RadLineUserDef = {
			UserId : {
				type: Sequelize.STRING(60)
			}
		};

// RIS interface
const RadRisInterfaceDef = {
		RisData : {
			type: Sequelize.JSONB
		}
	};

const RadScanPartRefDef = {
			Code : {
				type: Sequelize.STRING(10)
			},
			Name : {
				type: Sequelize.STRING(100)
			},
			Unit : {
				type: Sequelize.STRING(30)
			},
			Price : {
				type: Sequelize.FLOAT,
			},
			Common : {
				type: Sequelize.STRING(10)
			},
			RefPoint : {
				type: Sequelize.STRING(10)
			},
			Modality : {
				type: Sequelize.STRING(30)
			},
			MajorType : {
				type: Sequelize.STRING(30)
			},
			DF : {
				type: Sequelize.FLOAT,
			}
		};

//User_LineID
const RadScanPartAuxDef = {
			StudyDesc : {
				type: Sequelize.STRING(100)
			},
			ProtocolName : {
				type: Sequelize.STRING(100)
			},
			Scanparts : {
				type: Sequelize.JSON
			}
		};

const RadKeepLogDef = {
			caseId : {
				type: Sequelize.INTEGER
			},
			userId : {
				type: Sequelize.INTEGER
			},
			from : {
				type: Sequelize.INTEGER
			},
			to : {
				type: Sequelize.INTEGER
			},
			remark : {
				type: Sequelize.TEXT
			}
		};

const RadChatLogDef = {
			Log : {
				type: Sequelize.JSONB
			},
			caseId : {
				type: Sequelize.INTEGER
			},
			topicType : {
				type: Sequelize.STRING(20)
			},
			topicStatus : {
				type: Sequelize.INTEGER,
				/*
					0 = close
					1 = open
				*/
				defaultValue: 1
			}
		};

//Case_ID
//User_ID
const RadAILogDef = {
			studyId : {
				type: Sequelize.STRING(50)
			},
			seriesId : {
				type: Sequelize.STRING(50)
			},
			instanceId : {
				type: Sequelize.STRING(50)
			},
			ResultId : {
				type: Sequelize.STRING(50)
			},
			ResultJson : {
				type: Sequelize.JSONB
			}
		};

		//Hos_ID
		//Case_CSID
		//Case_UGTypeID
		//Case_UserID
		const RadConsultDef = {
			PatientHN : {
				type: Sequelize.STRING(50)
			},
			PatientName : {
				type: Sequelize.STRING(50)
			},
			PatientHRLink : {
				type: Sequelize.JSON,
			},
			UGType : {
				type: Sequelize.INTEGER,
			},
			RadiologistId : {
				type: Sequelize.INTEGER,
				allowNull: false
			}
		};

module.exports = {
	RadUserTypeDef,
	RadUserStatusDef,
	RadUserDef,
	RadUserInfoDef,
	RadUserProfileDef,
	RadHospitalDef,
	RadOrthancDef,
	RadUrgentTypeDef,
	RadGeneralStatusDef,
	RadCliameRightsDef,
	RadCaseStatusDef,
	RadPatientDef,
	RadDicomTransferLogDef,
	RadHospitalReportDef,
	//RadWorkingHourDef,
	//RadWorkingScheduleDef,
	RadTemplateDef,
	RadCaseDef,
	RadCaseResponseDef,
	RadCaseReportDef,
	RadLineUserDef,
	RadRisInterfaceDef,
	RadScanPartRefDef,
	RadScanPartAuxDef,
	RadPriceChartDef,
	RadKeepLogDef,
	RadChatLogDef,
	RadAILogDef,
	RadConsultDef
}
